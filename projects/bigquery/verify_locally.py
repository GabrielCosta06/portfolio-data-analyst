"""Translate the checked-in GoogleSQL to DuckDB and verify the synthetic fixture."""
import argparse
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import duckdb
from sqlglot import ErrorLevel, transpile

PROJECT = Path(__file__).resolve().parent
DATA = PROJECT.parents[1] / "data" / "processed"
OUTPUT = DATA / "bigquery-results.json"
TYPES = {"STRING": "VARCHAR", "DATE": "DATE", "INTEGER": "BIGINT", "NUMERIC": "DECIMAL(18, 2)"}


def query_results():
    schema = json.loads((PROJECT / "schema.json").read_text(encoding="utf-8"))
    columns = {column["name"]: TYPES[column["type"]] for column in schema}
    sql = transpile(
        (PROJECT / "analysis.sql").read_text(encoding="utf-8"),
        read="bigquery",
        write="duckdb",
        unsupported_level=ErrorLevel.RAISE,
    )
    with duckdb.connect() as db:
        db.execute("CREATE SCHEMA portfolio_demo")
        db.execute(
            "CREATE TABLE portfolio_demo.fact_sales_bigquery AS "
            "SELECT * FROM read_csv(?, header = true, columns = ?)",
            [str(DATA / "fact_sales.csv"), columns],
        )
        month_rows = db.execute(sql[0]).fetchall()
    return [
        {
            "month": month.strftime("%Y-%m"),
            "orders": orders,
            "revenue_cents": int(revenue * 100),
            "cost_cents": int(cost * 100),
            "profit_cents": int(profit * 100),
            "margin_pct": float(margin) if margin is not None else None,
            "growth_pct": float(growth) if growth is not None else None,
        }
        for month, orders, revenue, cost, profit, margin, growth in month_rows
    ]


def verify(rows, manifest):
    expected = manifest["monthly"]
    if len(rows) != len(expected):
        raise ValueError("The number of months differs from the pipeline manifest")

    previous = None
    for row, month in zip(rows, expected):
        if any(row[key] != value for key, value in month.items()):
            raise ValueError(f"Results differ from the manifest for {month['month']}")
        month_index = int(row["month"][:4]) * 12 + int(row["month"][5:])
        growth = None
        if previous and month_index == previous[0] + 1 and previous[1]:
            difference = Decimal(row["revenue_cents"] - previous[1])
            growth = float((100 * difference / previous[1]).quantize(Decimal(".01"), ROUND_HALF_UP))
        if row["growth_pct"] != growth:
            raise ValueError(f"Incorrect month-over-month growth for {row['month']}")
        previous = month_index, row["revenue_cents"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Require the checked-in evidence to match")
    args = parser.parse_args()
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    rows = query_results()
    verify(rows, manifest)
    evidence = json.dumps({"engine": "DuckDB", "source_dialect": "GoogleSQL", "rows": rows}, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != evidence:
            raise SystemExit("Update bigquery-results.json by running verify_locally.py")
    else:
        OUTPUT.write_text(evidence, encoding="utf-8")
    print(f"Verified {len(rows)} months against the pipeline manifest in DuckDB.")


if __name__ == "__main__":
    main()
