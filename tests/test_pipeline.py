import csv
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

spec = importlib.util.spec_from_file_location('pipeline', Path(__file__).resolve().parents[1]/'src'/'pipeline.py')
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root/'sales.csv'
        self.output = self.root/'out'
        pipeline.generate(self.source)

    def test_quarantine_and_accounting_reconcile(self):
        result = pipeline.run(self.source,self.output)
        self.assertEqual((result['input_rows'],result['accepted_rows'],result['quarantined_rows']), (670,600,70))
        self.assertEqual(result['rule_failures']['duplicate_order_id'],20)
        self.assertEqual(result['revenue_cents']-result['cost_cents'],result['profit_cents'])
        self.assertEqual(sum(row['revenue_cents'] for row in result['monthly']),result['revenue_cents'])
        self.assertEqual(sum(result['rule_failures'].values()),70)
        with closing(sqlite3.connect(self.output/'warehouse.sqlite')) as db:
            self.assertEqual(db.execute('SELECT count(distinct order_id) FROM fact_sales').fetchone()[0],600)

    def test_rerun_is_idempotent(self):
        first = pipeline.run(self.source,self.output)
        second = pipeline.run(self.source,self.output)
        self.assertEqual(first,second)
        self.assertEqual(json.loads((self.output/'sales.json').read_text(encoding='utf-8')).__len__(),600)

    def test_schema_drift_does_not_replace_previous_results(self):
        pipeline.run(self.source,self.output)
        previous = (self.output/'manifest.json').read_bytes()
        self.source.write_text('unexpected\nvalue\n',encoding='utf-8')
        with self.assertRaisesRegex(ValueError,'Schema mismatch'):
            pipeline.run(self.source,self.output)
        self.assertEqual((self.output/'manifest.json').read_bytes(),previous)

    def test_multiple_quality_failures_and_empty_input(self):
        with self.source.open(newline='',encoding='utf-8') as f:
            row = next(csv.DictReader(f))
        row.update(quantity='-2',unit_cost='Infinity',order_date='bad')
        pipeline.write_csv(self.source,pipeline.FIELDS,[row])
        result = pipeline.run(self.source,self.output)
        self.assertEqual(result['accepted_rows'],0)
        self.assertEqual(result['quarantined_rows'],1)
        self.assertEqual(len(result['rule_failures']),3)
        pipeline.write_csv(self.source,pipeline.FIELDS,[])
        result = pipeline.run(self.source,self.output)
        self.assertEqual(result['revenue_cents'],0)


if __name__ == '__main__':
    unittest.main()
