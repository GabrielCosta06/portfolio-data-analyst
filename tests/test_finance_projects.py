"""Regression tests for exact-cent reconciliation and CVM source lineage."""
from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
import cvm_tracker as cvm
import reconcile_payments as payments


class PaymentsTest(unittest.TestCase):
    def test_split_installments_and_chargeback_trace_to_the_bank(self):
        result = payments.reconcile()
        payouts = {row['payout_id']: row for row in result['payouts']}
        self.assertEqual(len(payouts['PAY-01']['bank_entries']), 2)
        split = [item for payout in payouts.values() for item in payout['settlements']
                 if item['sale_id'] == 'SALE-003']
        self.assertEqual([(item['installment'], item['gross_cents']) for item in split], [(1, 6000), (2, 6000)])
        self.assertEqual(payouts['PAY-02']['expected_cents'], 26354)
        reversal = next(item for item in payouts['PAY-02']['settlements'] if item['kind'] == 'chargeback')
        self.assertEqual(reversal['net_cents'], -6625)
        self.assertEqual(reversal['sale']['sale_id'], 'SALE-002')
        self.assertEqual(result['summary']['difference_cents'], -43983)
        self.assertEqual(result['summary']['absolute_gap_cents'], 47683)
        self.assertEqual([(key, row['status']) for key, row in payouts.items() if row['status'] != 'matched'],
                         [('PAY-03', 'amount_mismatch'), ('PAY-04', 'missing_payout'), ('PAY-06', 'unmatched_bank')])

    def test_cutoff_keeps_future_payouts_scheduled(self):
        report = payments.reconcile(as_of='2026-01-08')
        self.assertEqual(report['summary']['exceptions'], 0)
        self.assertEqual(report['summary']['matched'], 2)
        self.assertEqual(sum(row['status'] == 'scheduled' for row in report['payouts']), 3)

    def test_duplicate_installments_are_rejected(self):
        sales = payments.read_extract(payments.DATA / 'sales.csv', payments.SALES)
        settlements = payments.read_extract(payments.DATA / 'settlements.csv', payments.SETTLEMENTS)
        settlements['duplicated'] = dict(settlements['SET-003'], movement_id='duplicated')
        with self.assertRaisesRegex(ValueError, 'duplicate installment'):
            payments.group_settlements(sales, settlements)


class CVMTest(unittest.TestCase):
    def test_scale_changes_are_compared_in_exact_brl_cents(self):
        self.assertEqual(cvm.amount_to_cents('1.23456', 'MIL'), 123456)
        self.assertEqual(cvm.amount_to_cents('1234.56', 'UNIDADE'), 123456)
        before = cvm.normalize([dict(account='3.01', label='Revenue', source_amount='1.23456', source_scale='MIL')])
        after = cvm.normalize([dict(account='3.01', label='Sales', source_amount='1234.56', source_scale='UNIDADE')])
        item = cvm.compare(before, after)[0]
        self.assertEqual((item['delta_cents'], item['status']), (0, 'label'))
        self.assertIsNone(cvm.compare(before, {})[0]['delta_cents'])
        self.assertEqual(cvm.compare({}, after)[0]['status'], 'added')

    def test_curated_cases_keep_amounts_and_submission_versions_separate(self):
        report = cvm.build_report()
        self.assertEqual(report['period'], ['2024-01-01', '2024-12-31'])
        cases = {case['issuer']: case for case in report['cases']}
        axia = cases['002437']
        self.assertEqual([filing['version'] for filing in axia['timeline'] if filing['filing_date'] == '2024-12-31'], [1, 2])
        comparison = axia['comparisons'][0]
        self.assertEqual((comparison['before']['version'], comparison['before']['document_id']), (2, '145424'))
        self.assertEqual(comparison['after']['filing_date'], '2025-12-31')
        self.assertEqual(comparison['counts'], {'unchanged': 17, 'amount': 10, 'removed': 32})
        self.assertEqual(cases['005410']['comparisons'][0]['counts'], {'unchanged': 29})

    def test_archiving_same_payload_keeps_first_capture(self):
        raw = BytesIO()
        with ZipFile(raw, 'w') as archive:
            archive.writestr('dfp_cia_aberta_2024.csv',
                'CD_CVM;DT_REFER;VERSAO;DENOM_CIA;ID_DOC;DT_RECEB\n002437;2024-12-31;1;Demo;1;2025-01-01\n')
            headers = ['CD_CVM','DT_REFER','VERSAO','CD_CONTA','DT_INI_EXERC','DT_FIM_EXERC',
                       'ORDEM_EXERC','MOEDA','GRUPO_DFP','DS_CONTA','VL_CONTA','ESCALA_MOEDA']
            row = ['002437','2024-12-31','1','3.01','2024-01-01','2024-12-31',
                   'ÚLTIMO','REAL',cvm.SCOPE,'Receita','123','MIL']
            archive.writestr('dfp_cia_aberta_DRE_con_2024.csv', (';'.join(headers) + '\n' + ';'.join(row)).encode('latin-1'))
        with TemporaryDirectory() as temp:
            directory = Path(temp)
            original = cvm.capture(2024, raw.getvalue(), directory, '2026-11-18T12:00:00+00:00')
            before = original.read_bytes()
            replay = cvm.capture(2024, raw.getvalue(), directory, '2026-11-19T12:00:00+00:00')
            self.assertEqual((original, before), (replay, replay.read_bytes()))
            self.assertEqual(list(directory.iterdir()), [original])
