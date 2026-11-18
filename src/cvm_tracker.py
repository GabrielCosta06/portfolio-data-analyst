"""Capture CVM DFP archives and compare consolidated statements for fiscal 2024."""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
from decimal import Decimal
from hashlib import sha256
from io import BytesIO, TextIOWrapper
from itertools import combinations
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import Request, urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOTS = ROOT / 'projects/cvm-filings/data'
REPORT = ROOT / 'evidence/cvm-filing-diffs.json'
BASE = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/'
ISSUERS = ('002437', '015539', '005410')
PERIOD = ('2024-01-01', '2024-12-31')
SCALE = {'UNIDADE': 100, 'MIL': 100_000}
SCOPE = 'DF Consolidado - Demonstração do Resultado'


def archive_url(year):
    return f'{BASE}dfp_cia_aberta_{year}.zip'


def rows(archive, member):
    with TextIOWrapper(archive.open(member), encoding='latin-1', newline='') as handle:
        reader = csv.DictReader(handle, delimiter=';')
        for row in reader:
            yield reader.line_num, row


def encode(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + '\n'


def amount_to_cents(value, scale):
    amount = Decimal(value)
    if not amount.is_finite():
        raise ValueError('Non-finite amount in CVM export')
    cents = amount * SCALE[scale]
    if cents != cents.to_integral_value() or abs(cents) > 2**53 - 1:
        raise ValueError('Amount cannot be stored exactly in BRL cents for the web demo')
    return int(cents)


def extract_archive(payload, year, captured_on):
    digest = sha256(payload).hexdigest()
    metadata_member = f'dfp_cia_aberta_{year}.csv'
    statement_member = f'dfp_cia_aberta_DRE_con_{year}.csv'
    filings = {}
    account_sets = defaultdict(dict)
    reference = f'{year}-12-31'
    expected_period_order = 'ÚLTIMO' if year == int(PERIOD[1][:4]) else 'PENÚLTIMO'
    with ZipFile(BytesIO(payload)) as archive:
        for line, row in rows(archive, metadata_member):
            issuer, filing_date = row['CD_CVM'], row['DT_REFER']
            if issuer not in ISSUERS or filing_date != reference:
                continue
            key = issuer, int(row['VERSAO'])
            if key in filings:
                raise ValueError(f'Duplicate CVM filing {key}')
            filings[key] = {
                'issuer': issuer, 'company': row['DENOM_CIA'], 'filing_date': filing_date,
                'version': key[1], 'document_id': row['ID_DOC'], 'received_on': row['DT_RECEB'],
                'source_line': line,
            }

        for line, row in rows(archive, statement_member):
            issuer = row['CD_CVM']
            code = row['CD_CONTA']
            if (issuer not in ISSUERS or row['DT_REFER'] != reference or
                    (row['DT_INI_EXERC'], row['DT_FIM_EXERC']) != PERIOD or
                    row['ORDEM_EXERC'] != expected_period_order or
                    code == '3.99' or code.startswith('3.99.')):
                continue
            if row['MOEDA'] != 'REAL' or row['GRUPO_DFP'] != SCOPE:
                raise ValueError(f'Unexpected currency or scope on DRE row {line}')
            key = issuer, int(row['VERSAO'])
            if key not in filings or code in account_sets[key]:
                raise ValueError(f'Unlinked or duplicate DRE account {key}/{code}')
            account_sets[key][code] = {
                'account': code, 'label': row['DS_CONTA'], 'source_amount': row['VL_CONTA'],
                'source_scale': row['ESCALA_MOEDA'], 'source_line': line,
            }
    if not filings or not account_sets:
        raise ValueError('No curated issuers or matching fiscal 2024 DRE rows in this archive')
    return {
        'source': {
            'id': digest, 'year': year, 'captured_on': captured_on,
            'url': archive_url(year), 'statements_member': statement_member,
            'submissions_member': metadata_member,
        },
        'filings': [filing for _, filing in sorted(filings.items())],
        'statements': [
            {'document_id': filings[key]['document_id'],
             'lines': [account for _, account in sorted(accounts.items())]}
            for key, accounts in sorted(account_sets.items())
        ],
    }


def capture(year, payload, directory, captured_on):
    snapshot = extract_archive(payload, year, captured_on)
    name = f"{year}-{snapshot['source']['id']}.json"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / name
    with NamedTemporaryFile(mode='w', dir=directory, encoding='utf-8', newline='\n', delete=False) as temporary:
        staging = Path(temporary.name)
        temporary.write(encode(snapshot))
    try:
        try:
            os.link(staging, path)
        except FileExistsError:
            existing = json.loads(path.read_text(encoding='utf-8'))
            existing['source']['captured_on'] = captured_on
            if existing != snapshot:
                raise ValueError(f'Existing snapshot contents do not match {name}')
    finally:
        staging.unlink()
    return path


def normalize(lines):
    accounts = {}
    for row in lines:
        code = row['account']
        if code in accounts:
            raise ValueError(f'Duplicate account {code}')
        accounts[code] = dict(row, cents=amount_to_cents(row['source_amount'], row['source_scale']))
    return accounts


def compare(before, after):
    differences = []
    for code in sorted(before.keys() | after.keys()):
        old, new = before.get(code), after.get(code)
        if old is None:
            status = 'added'
        elif new is None:
            status = 'removed'
        elif old['cents'] != new['cents']:
            status = 'amount'
        elif old['label'] != new['label']:
            status = 'label'
        else:
            status = 'unchanged'
        differences.append({
            'account': code, 'status': status, 'before': old, 'after': new,
            'delta_cents': new['cents'] - old['cents'] if old and new else None,
        })
    return differences


def filing_order(filing):
    return filing['filing_date'], filing['version'], filing['received_on']


def build_report(directory=SNAPSHOTS):
    sources, histories, available = {}, defaultdict(dict), defaultdict(dict)
    snapshots = (json.loads(path.read_text(encoding='utf-8')) for path in sorted(directory.glob('*.json')))
    for snapshot in sorted(snapshots, key=lambda item: item['source']['captured_on']):
        source = snapshot['source']
        sources[source['id']] = source
        filings = {filing['document_id']: filing for filing in snapshot['filings']}
        for document_id, filing in filings.items():
            calendar = histories[filing['issuer']]
            if document_id in calendar:
                for key in ('issuer', 'filing_date', 'version', 'received_on'):
                    if calendar[document_id][key] != filing[key]:
                        raise ValueError(f'Conflicting filing metadata for document {document_id}')
            calendar.setdefault(document_id, {**filing, 'source_id': source['id']})
        for statement in snapshot['statements']:
            filing = filings[statement['document_id']]
            accounts = normalize(statement['lines'])
            # A later archive may repeat identical values and labels for the same document.
            signature = tuple((code, row['label'], row['cents']) for code, row in sorted(accounts.items()))
            key = filing['document_id'], signature
            available[filing['issuer']].setdefault(key, (
                {**filing, 'source_id': source['id']}, accounts,
            ))
    cases = []
    for issuer in ISSUERS:
        statements = sorted(available[issuer].values(), key=lambda entry: (
            *filing_order(entry[0]), sources[entry[0]['source_id']]['captured_on']))
        comparisons = []
        for (first, before), (second, after) in combinations(statements, 2):
            differences = compare(before, after)
            comparisons.append({
                'before': first, 'after': second, 'counts': dict(Counter(row['status'] for row in differences)),
                'changes': differences,
            })
        if comparisons:
            cases.append({
                'issuer': issuer, 'company': statements[-1][0]['company'],
                'timeline': sorted(histories[issuer].values(), key=filing_order), 'comparisons': comparisons,
            })
    if not cases:
        raise ValueError('Capture at least two comparable DRE statements to build the report')
    return {'period': list(PERIOD), 'currency': 'BRL', 'sources': sources, 'cases': cases}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify the checked-in report')
    parser.add_argument('--capture', type=int, choices=(2024, 2025), help='Capture an official archive')
    parser.add_argument('--archive', type=Path, help='Use a downloaded archive for --capture')
    parser.add_argument('--snapshots', type=Path, default=SNAPSHOTS)
    parser.add_argument('--report', type=Path, default=REPORT)
    args = parser.parse_args()
    if args.archive and args.capture is None:
        parser.error('--archive requires --capture')
    if args.capture is not None:
        if args.check:
            parser.error('--capture and --check cannot be combined')
        if args.archive:
            payload = args.archive.read_bytes()
        else:
            request = Request(archive_url(args.capture), headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(request, timeout=45) as response:
                payload = response.read()
        path = capture(args.capture, payload, args.snapshots, datetime.now(timezone.utc).isoformat(timespec='seconds'))
        print(f'Preserved {path.name}')
        return
    report = build_report(args.snapshots)
    output = encode(report)
    if args.check:
        if args.report.read_text(encoding='utf-8') != output:
            raise SystemExit('The CVM comparison differs from the checked-in report')
    else:
        args.report.write_text(output, encoding='utf-8')
    print(f"Compared {len(report['cases'])} CVM issuers across {len(report['sources'])} archived extracts")


if __name__ == '__main__':
    main()
