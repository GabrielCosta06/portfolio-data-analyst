# Payments reconciliation

Reconcile one synthetic sales week from three input ledgers. The case tracks 14 ERP sales, six payout references and three unresolved exceptions as of January 14, 2026.

- [ERP sales](data/sales.csv) record the original order amount and installment count.
- [Acquirer movements](data/settlements.csv) record a capture installment or chargeback, fees, payout ID and due date.
- [Bank postings](data/bank.csv) record the booked net amount and payout reference. Two postings apply to the same payout.

Run from the repository root with Python 3.10+:

```sh
python src/reconcile_payments.py
python src/reconcile_payments.py --check
```

The engine joins on payout and sale IDs, validates sales and installment totals, and computes net payout as signed gross less fees in integer BRL cents. The three exception classes in the fixture are a short deposit, a missing payout, and an unmatched bank credit. The absolute difference metric adds the magnitude of each exception. Outstanding settlements beyond the cutoff are classified as scheduled.

The [audit JSON](../../evidence/payments.json) contains the full lineage and [the CSV](../../evidence/payment-exceptions.csv) is the exception queue. Any amount differences provide a payout to investigate. The fixture identifies the posting and its related records, with no assumption about the cause of a bank shortfall.
