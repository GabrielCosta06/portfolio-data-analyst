"""Reconcile the synthetic ERP, settlement and bank extracts in integer BRL cents."""
import argparse
from collections import defaultdict
import csv
from datetime import date
from io import StringIO
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'projects/reconciliation/data'
REPORT = ROOT / 'evidence/payments.json'
EXCEPTIONS = ROOT / 'evidence/payment-exceptions.csv'
AS_OF = '2026-01-14'

SALES = ('sale_id', 'sold_on', 'amount_cents', 'installments')
SETTLEMENTS = ('movement_id', 'payout_id', 'sale_id', 'kind', 'installment', 'gross_cents', 'fee_cents', 'due_on')
BANK = ('bank_id', 'payout_id', 'posted_on', 'amount_cents')
EXCEPTION_FIELDS = ('payout_id', 'status', 'due_on', 'expected_cents', 'bank_cents', 'difference_cents')


def read_extract(path, fields):
    with path.open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        if tuple(reader.fieldnames or ()) != fields:
            raise ValueError(f'{path.name} has an unexpected header')
        rows = {}
        for row in reader:
            if None in row or any(value is None or not value.strip() for value in row.values()):
                raise ValueError(f'{path.name}: missing or extra values on line {reader.line_num}')
            key = row[fields[0]]
            if key in rows:
                raise ValueError(f'{path.name}: duplicate {fields[0]} {key}')
            for field, value in row.items():
                if field.endswith('_cents') or field in ('installment', 'installments'):
                    row[field] = int(value)
                elif field.endswith('_on'):
                    if date.fromisoformat(value).isoformat() != value:
                        raise ValueError(f'{path.name}: expected ISO date on line {reader.line_num}')
            rows[key] = row
    return rows


def group_settlements(sales, settlements):
    payouts = defaultdict(list)
    captures = defaultdict(dict)
    reversals = defaultdict(int)
    for sale in sales.values():
        if sale['amount_cents'] <= 0 or sale['installments'] < 1:
            raise ValueError(f"Invalid sale {sale['sale_id']}")
    for entry in settlements.values():
        sale_id = entry['sale_id']
        sale = sales.get(sale_id)
        gross = entry['gross_cents']
        installment = entry['installment']
        fee = entry['fee_cents']
        expected_kind = 'sale' if gross > 0 else 'chargeback'
        if fee < 0 or not gross or entry['kind'] != expected_kind:
            raise ValueError(f"Invalid movement {entry['movement_id']}")
        if (expected_kind == 'sale' and installment < 1) or (expected_kind == 'chargeback' and installment != 0):
            raise ValueError(f"Invalid installment in {entry['movement_id']}")
        if sale:
            if entry['due_on'] < sale['sold_on']:
                raise ValueError(f"Settlement predates sale {sale_id}")
            if expected_kind == 'sale':
                if not 1 <= installment <= sale['installments'] or installment in captures[sale_id]:
                    raise ValueError(f"Invalid or duplicate installment for {sale_id}")
                captures[sale_id][installment] = gross
            else:
                reversals[sale_id] += -gross
        payouts[entry['payout_id']].append(dict(entry, sale=sale, net_cents=gross - fee))
    for sale_id, sale in sales.items():
        installed = captures[sale_id]
        captured = sum(installed.values())
        if (captured > sale['amount_cents'] or
                len(installed) == sale['installments'] and captured != sale['amount_cents']):
            raise ValueError(f'Installments do not reconcile to ERP sale {sale_id}')
        if reversals[sale_id] > captured:
            raise ValueError(f'Chargebacks exceed captured sales for {sale_id}')
    return payouts


def payout_status(items, deposits, expected, actual, due_on, as_of):
    if not items:
        return 'unmatched_bank'
    if not deposits and due_on > as_of:
        return 'scheduled'
    if any(item['sale'] is None for item in items):
        return 'unmatched_sale'
    if not deposits and expected:
        return 'missing_payout'
    return 'amount_mismatch' if actual != expected else 'matched'


def reconcile(directory=DATA, as_of=AS_OF):
    if date.fromisoformat(as_of).isoformat() != as_of:
        raise ValueError('Use an ISO date for the cutoff')
    sales = read_extract(directory / 'sales.csv', SALES)
    settlements = read_extract(directory / 'settlements.csv', SETTLEMENTS)
    bank = read_extract(directory / 'bank.csv', BANK)
    payouts = group_settlements(sales, settlements)
    credits = defaultdict(list)
    for deposit in bank.values():
        if deposit['posted_on'] <= as_of:
            credits[deposit['payout_id']].append(deposit)

    report = []
    for payout_id in sorted(payouts.keys() | credits.keys()):
        items = payouts.get(payout_id, [])
        deposits = credits.get(payout_id, [])
        due_dates = {item['due_on'] for item in items}
        if len(due_dates) > 1:
            raise ValueError(f'Conflicting due dates for {payout_id}')
        due_on = next(iter(due_dates), None)
        expected = sum(item['net_cents'] for item in items)
        actual = sum(deposit['amount_cents'] for deposit in deposits)
        status = payout_status(items, deposits, expected, actual, due_on, as_of)
        report.append({
            'payout_id': payout_id, 'due_on': due_on, 'status': status,
            'expected_cents': expected, 'bank_cents': actual, 'difference_cents': actual - expected,
            'settlements': items, 'bank_entries': deposits,
        })

    due = [row for row in report if row['status'] != 'scheduled']
    exceptions = [row for row in due if row['status'] != 'matched']
    expected = sum(row['expected_cents'] for row in due)
    actual = sum(row['bank_cents'] for row in due)
    return {
        'currency': 'BRL', 'synthetic': True, 'as_of': as_of,
        'sales_period': [min(row['sold_on'] for row in sales.values()),
                         max(row['sold_on'] for row in sales.values())] if sales else [],
        'summary': {
            'sales': len(sales), 'payouts': len(report), 'matched': len(due) - len(exceptions),
            'exceptions': len(exceptions), 'expected_cents': expected, 'bank_cents': actual,
            'difference_cents': actual - expected,
            'absolute_gap_cents': sum(abs(row['difference_cents']) for row in exceptions),
        },
        'payouts': report,
    }


def artifacts(report):
    output = StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=EXCEPTION_FIELDS, extrasaction='ignore', lineterminator='\n')
    writer.writeheader()
    writer.writerows(row for row in report['payouts'] if row['status'] not in ('matched', 'scheduled'))
    return {REPORT: json.dumps(report, ensure_ascii=False, indent=2) + '\n', EXCEPTIONS: output.getvalue()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify the published evidence')
    args = parser.parse_args()
    report = reconcile()
    for path, contents in artifacts(report).items():
        if args.check:
            if path.read_text(encoding='utf-8') != contents:
                raise SystemExit(f'{path.name} differs from the generated result')
        else:
            path.write_text(contents, encoding='utf-8')
    print(json.dumps(report['summary'], indent=2))


if __name__ == '__main__':
    main()
