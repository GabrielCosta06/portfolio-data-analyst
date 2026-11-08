"""Reproducible synthetic sales pipeline. Python stdlib only; no enterprise data."""
import argparse
import calendar
import csv
import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['order_id', 'order_date', 'category', 'region', 'channel', 'quantity', 'unit_price', 'unit_cost']
CATEGORIES = ['Equipamentos', 'Consumiveis', 'Servicos']
REGIONS = ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste']
CHANNELS = ['Direto', 'Distribuidor']


def write_csv(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)


def generate(path):
    """600 distinct valid order lines + 20 duplicates + 50 invalid rows."""
    rows = []
    for i in range(600):
        month = i // 100 + 1
        category = CATEGORIES[i % 3]
        price = [420, 85, 260][i % 3] + (i % 7) * 5
        cost = [285, 49, 115][i % 3] + (i % 5) * 3
        rows.append(dict(zip(FIELDS, [f'ORD-{i+1:05d}', f'2026-{month:02d}-{i%28+1:02d}', category,
            REGIONS[(i // 3) % 4], CHANNELS[(i // 7) % 2], str(1 + i % 8), f'{price:.2f}', f'{cost:.2f}'])))
    rows.extend(dict(row) for row in rows[:20])
    for field, bad in [('quantity', '0'), ('unit_price', 'NaN'), ('category', ''),
                       ('order_date', '2026-02-31'), ('unit_cost', '-1')]:
        for i in range(10):
            row = dict(rows[i])
            row['order_id'] = f'INVALID-{field}-{i}'
            row[field] = bad
            rows.append(row)
    write_csv(path, FIELDS, rows)


def money(value):
    number = Decimal(value)
    if not number.is_finite() or number < 0 or number != number.quantize(Decimal('.01')):
        raise ValueError('Expected finite non-negative currency with at most 2 decimals')
    return int(number * 100)


def validate(row, seen):
    errors = []
    if not row['order_id'].strip():
        errors.append('missing_order_id')
    elif row['order_id'] in seen:
        errors.append('duplicate_order_id')
    try:
        date.fromisoformat(row['order_date'])
    except ValueError:
        errors.append('invalid_date')
    for field, allowed in [('category', CATEGORIES), ('region', REGIONS), ('channel', CHANNELS)]:
        if row[field] not in allowed:
            errors.append(f'invalid_{field}')
    try:
        quantity = int(row['quantity'])
        if quantity <= 0:
            raise ValueError()
    except ValueError:
        errors.append('invalid_quantity')
        quantity = 0
    amounts = {}
    for field in ['unit_price', 'unit_cost']:
        try:
            amounts[field] = money(row[field])
        except (InvalidOperation, ValueError):
            errors.append(f'invalid_{field}')
    return errors, quantity, amounts


def run(source, output):
    # Validate schema before changing the last successful result.
    with source.open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != FIELDS:
            raise ValueError(f'Schema mismatch. Expected {FIELDS}; got {reader.fieldnames}')
        raw = list(reader)
    seen, clean, rejected = set(), [], []
    rules = {}
    for row_number, row in enumerate(raw, 2):
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f'Malformed CSV row {row_number}')
        errors, quantity, amounts = validate(row, seen)
        if errors:
            rejected.append(dict(row, source_line=row_number, reasons=';'.join(errors)))
            for error in errors:
                rules[error] = rules.get(error, 0) + 1
            continue
        seen.add(row['order_id'])
        revenue = quantity * amounts['unit_price']
        cost = quantity * amounts['unit_cost']
        clean.append((row['order_id'], row['order_date'], row['category'], row['region'], row['channel'],
                      quantity, revenue, cost, revenue - cost))
    output.mkdir(parents=True, exist_ok=True)
    db_path = output / 'warehouse.sqlite'
    with closing(sqlite3.connect(db_path)) as db, db:
        db.executescript('''
            DROP TABLE IF EXISTS fact_sales;
            CREATE TABLE fact_sales (
                order_id TEXT PRIMARY KEY, order_date TEXT NOT NULL, category TEXT NOT NULL,
                region TEXT NOT NULL, channel TEXT NOT NULL, quantity INTEGER CHECK(quantity > 0),
                revenue_cents INTEGER NOT NULL, cost_cents INTEGER NOT NULL, profit_cents INTEGER NOT NULL);
        ''')
        db.executemany('INSERT INTO fact_sales VALUES (?,?,?,?,?,?,?,?,?)', clean)
        db.executescript('''
            CREATE INDEX IF NOT EXISTS ix_sales_date ON fact_sales(order_date);
            DROP VIEW IF EXISTS monthly_performance;
            CREATE VIEW monthly_performance AS
            SELECT substr(order_date,1,7) AS month, COUNT(*) AS orders,
                SUM(revenue_cents) AS revenue_cents, SUM(cost_cents) AS cost_cents,
                SUM(profit_cents) AS profit_cents,
                ROUND(100.0 * SUM(profit_cents)/NULLIF(SUM(revenue_cents),0),2) AS margin_pct
            FROM fact_sales GROUP BY substr(order_date,1,7);
        ''')
        count, revenue, cost, profit = db.execute('SELECT count(*),sum(revenue_cents),sum(cost_cents),sum(profit_cents) FROM fact_sales').fetchone()
        monthly = [dict(zip(['month','orders','revenue_cents','cost_cents','profit_cents','margin_pct'], row))
                   for row in db.execute('SELECT * FROM monthly_performance ORDER BY month')]
        categories = [dict(zip(['category','revenue_cents','profit_cents'], row)) for row in db.execute(
            'SELECT category,sum(revenue_cents),sum(profit_cents) FROM fact_sales GROUP BY category ORDER BY sum(revenue_cents) DESC')]
    facts = [dict(zip(['OrderId','Date','Category','Region','Channel','Quantity','Revenue','Cost','Profit'],
        [*row[:6], f'{row[6]/100:.2f}', f'{row[7]/100:.2f}', f'{row[8]/100:.2f}'])) for row in clean]
    write_csv(output / 'fact_sales.csv', list(facts[0]) if facts else ['OrderId','Date','Category','Region','Channel','Quantity','Revenue','Cost','Profit'], facts)
    dates = []
    for month in range(1,7):
        for day in range(1, calendar.monthrange(2026,month)[1]+1):
            dates.append({'Date':f'2026-{month:02d}-{day:02d}','Year':2026,'Month':month,'MonthLabel':f'2026-{month:02d}'})
    write_csv(output / 'dim_date.csv', ['Date','Year','Month','MonthLabel'], dates)
    write_csv(output / 'quarantine.csv', FIELDS + ['source_line','reasons'], rejected)
    manifest = {'dataset':'Synthetic sales demo; NOT Baumer/TOTVS data', 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'input_rows':len(raw),'accepted_rows':count,'quarantined_rows':len(rejected),'rule_failures':rules,
        'revenue_cents':revenue or 0,'cost_cents':cost or 0,'profit_cents':profit or 0,
        'margin_pct':round(100*profit/revenue,2) if revenue else 0,'monthly':monthly,'categories':categories}
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Dashboard has the accepted rows, not synthetic precomputed UI metrics.
    (output/'sales.json').write_text(json.dumps(facts,ensure_ascii=False),encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--source', type=Path, default=ROOT/'data'/'raw'/'sales.csv')
    parser.add_argument('--output', type=Path, default=ROOT/'data'/'processed')
    args = parser.parse_args()
    if args.generate:
        generate(args.source)
    print(json.dumps(run(args.source,args.output),ensure_ascii=False,indent=2))
