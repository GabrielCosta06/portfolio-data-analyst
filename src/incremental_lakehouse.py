"""Reproduce the synthetic incremental case and verify its state with Delta Lake."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from pipeline import ROOT, validate

BASELINE = ROOT / 'data/raw/sales.csv'
CHANGES = ROOT / 'projects/pipeline/incremental_batch.csv'
EVIDENCE = ROOT / 'evidence/incremental-delta.json'
ORDER_SCHEMA = (
    'order_id string, revision long, order_date string, category string, region string, '
    'channel string, quantity long, revenue_cents long, cost_cents long'
)
REJECT_SCHEMA = 'batch_id string, source_line long, order_id string, order_date string, reason string'


def batches():
    with BASELINE.open(newline='', encoding='utf-8') as handle:
        baseline = [dict(row, revision='1') for row in list(csv.DictReader(handle))[:600]]
    with CHANGES.open(newline='', encoding='utf-8') as handle:
        changes = list(csv.DictReader(handle))
    return baseline, changes


def prepare(batch_id, rows, current):
    """Keep the first valid event per order in an immutable input batch."""
    accepted, rejected, seen = {}, {}, set()
    for line, row in enumerate(rows, 2):
        errors, quantity, amounts = validate(row, seen)
        try:
            revision = int(row['revision'])
            if revision < 1:
                raise ValueError
        except ValueError:
            errors.append('invalid_revision')
        order_id = row['order_id']
        previous = current.get(order_id)
        if not errors:
            order = {
                'order_id': order_id, 'revision': revision, 'order_date': row['order_date'],
                'category': row['category'], 'region': row['region'], 'channel': row['channel'],
                'quantity': quantity, 'revenue_cents': quantity * amounts['unit_price'],
                'cost_cents': quantity * amounts['unit_cost'],
            }
            if previous and revision == previous['revision'] and order != previous:
                errors.append('revision_conflict')
            else:
                seen.add(order_id)
                accepted[order_id] = order
                continue
        rejected[batch_id, line] = {
            'batch_id': batch_id, 'source_line': line, 'order_id': order_id,
            'order_date': row['order_date'], 'reason': ';'.join(errors),
        }
    return accepted, rejected


def projected_state(before, accepted, rejected):
    current, quarantine = before
    changed = {
        key: row for key, row in accepted.items()
        if key not in current or row['revision'] > current[key]['revision']
    }
    return current | changed, rejected | quarantine


def fingerprint(state):
    entities = [sorted(table.values(), key=lambda row: tuple(row[k] for k in keys))
                for table, keys in zip(state, [('order_id',), ('batch_id', 'source_line')])]
    return hashlib.sha256(json.dumps(entities, sort_keys=True).encode()).hexdigest()


def summarize(before, after):
    old, old_rejects = before
    new, new_rejects = after
    revenue = sum(row['revenue_cents'] for row in new.values())
    return {
        'inserted': len(new.keys() - old.keys()),
        'updated': sum(new[key] != old[key] for key in new.keys() & old.keys()),
        'quarantined': len(new_rejects.keys() - old_rejects.keys()),
        'orders': len(new),
        'revenue_cents': revenue,
        'profit_cents': revenue - sum(row['cost_cents'] for row in new.values()),
        'stored_rejections': len(new_rejects),
        'sha256': fingerprint(after),
    }


def describe_events(rows, batch_id, before, after):
    orders, quarantine = after
    events = []
    for line, row in enumerate(rows, 2):
        order_id = row['order_id']
        previous = before.get(order_id)
        current = orders.get(order_id)
        rejection = quarantine.get((batch_id, line))
        if rejection:
            action = 'quarantined'
        elif current == previous:
            action = 'unchanged'
        else:
            action = 'updated' if previous else 'inserted'
        events.append({
            'order_id': order_id, 'order_date': row['order_date'], 'revision': row['revision'],
            'action': action, 'before_cents': previous and previous['revenue_cents'],
            'after_cents': current and current['revenue_cents'],
            'reason': rejection and rejection['reason'],
        })
    return events


class DeltaStore:
    """Single-writer demo with separate Delta transactions for orders and quarantine."""

    def __init__(self, spark, directory):
        self.spark = spark
        self.orders = str(directory / 'orders')
        self.quarantine = str(directory / 'quarantine')

    def frame(self, rows, schema):
        return self.spark.createDataFrame(list(rows.values()), schema)

    def write(self, before, accepted, rejected, initial=False):
        from delta.tables import DeltaTable

        orders = self.frame(accepted, ORDER_SCHEMA)
        quarantine = self.frame(rejected, REJECT_SCHEMA)
        if initial:
            orders.write.format('delta').save(self.orders)
            quarantine.write.format('delta').save(self.quarantine)
        else:
            (DeltaTable.forPath(self.spark, self.orders).alias('t')
             .merge(orders.alias('s'), 't.order_id = s.order_id')
             .whenMatchedUpdateAll('s.revision > t.revision')
             .whenNotMatchedInsertAll().execute())
            (DeltaTable.forPath(self.spark, self.quarantine).alias('t')
             .merge(quarantine.alias('s'), 't.batch_id = s.batch_id and t.source_line = s.source_line')
             .whenNotMatchedInsertAll().execute())
        actual_orders = self.read(self.orders, ('order_id',))
        actual_rejects = self.read(self.quarantine, ('batch_id', 'source_line'))
        actual = {key[0]: row for key, row in actual_orders.items()}, actual_rejects
        if actual != projected_state(before, accepted, rejected):
            raise ValueError('Delta readback differs from expected state')
        return actual

    def read(self, path, keys):
        rows = [row.asDict() for row in self.spark.read.format('delta').load(path).collect()]
        indexed = {tuple(row[key] for key in keys): row for row in rows}
        if len(indexed) != len(rows):
            raise ValueError('Delta table contains duplicate keys')
        return indexed


def run_case(store=None):
    baseline, changes = batches()
    before = {}, {}
    steps = {}
    for step, batch_id, rows in [('baseline', 'initial', baseline),
                                 ('incremental', 'changes', changes), ('replay', 'changes', changes)]:
        accepted, rejected = prepare(batch_id, rows, before[0])
        after = (store.write(before, accepted, rejected, initial=step == 'baseline')
                 if store else projected_state(before, accepted, rejected))
        steps[step] = summarize(before, after)
        if step == 'incremental':
            event_details = describe_events(rows, batch_id, before[0], after)
        before = after
    if steps['replay']['sha256'] != steps['incremental']['sha256']:
        raise ValueError('Replaying the incremental batch changes the stored data')
    return {'steps': steps, 'events': event_details}


def run_delta():
    from delta import configure_spark_with_delta_pip
    from pyspark.sql import SparkSession

    builder = (SparkSession.builder.master('local[2]').appName('portfolio-incremental')
               .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
               .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog')
               .config('spark.sql.shuffle.partitions', '2')
               .config('spark.ui.enabled', 'false'))
    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel('ERROR')
    try:
        with TemporaryDirectory(prefix='portfolio-incremental-') as directory:
            return run_case(DeltaStore(spark, Path(directory)))
    finally:
        spark.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-delta', action='store_true', help='Write and read back real Delta tables')
    parser.add_argument('--check', action='store_true', help='Compare with published evidence')
    args = parser.parse_args()
    report = run_delta() if args.verify_delta else run_case()
    output = json.dumps(report, indent=2) + '\n'
    if args.check:
        if EVIDENCE.read_text(encoding='utf-8') != output:
            raise SystemExit('The incremental result differs from the published evidence')
    else:
        EVIDENCE.write_text(output, encoding='utf-8')
    print('Replayed batch leaves both table fingerprints and all totals unchanged.')


if __name__ == '__main__':
    main()
