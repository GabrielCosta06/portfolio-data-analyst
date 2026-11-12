"""Incremental commercial mart. Standard library; synthetic data only.

Publication switches one atomic pointer between immutable, fully reconciled snapshots.
The previous snapshot is also the recovery state. No mutable database is shared by runs.
"""
from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import json
import os
import random
import shutil
import sqlite3
import tempfile
from collections import Counter
from contextlib import closing
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "commercial-v1"
REGIONS = ["Sudeste", "Sul", "Nordeste", "Centro-Oeste"]
PRODUCTS = [
    {"id": "P01", "name": "Atlas", "category": "Equipamentos", "price": 185000, "cost": 112000},
    {"id": "P02", "name": "Prisma", "category": "Equipamentos", "price": 98000, "cost": 57000},
    {"id": "P03", "name": "Kit Essencial", "category": "Consumíveis", "price": 18500, "cost": 8500},
    {"id": "P04", "name": "Kit Plus", "category": "Consumíveis", "price": 32000, "cost": 15800},
    {"id": "P05", "name": "Manutenção", "category": "Serviços", "price": 65000, "cost": 24000},
    {"id": "P06", "name": "Instalação", "category": "Serviços", "price": 42000, "cost": 17000},
]


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def digest(value):
    return hashlib.sha256(encode(value)).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode(value))


def fixture(folder):
    """Varying seasonality, discount, mix, costs, returns; reproducible with fixed seed."""
    rng = random.Random(260611)
    customers = [{"id": f"C{i:03}", "name": f"Cliente {i:02}", "segment": ["Enterprise", "Mid-market", "SMB"][i % 3],
                  "region": REGIONS[i % 4]} for i in range(1, 49)]
    dims = {"customers": customers, "products": PRODUCTS}
    rows = []
    for month in range(1, 11):
        count = 115 + month * 13 + rng.randint(-15, 24)
        for order in range(count):
            customer = rng.choice(customers)
            order_id = f"SO-{month:02}-{order:04}"
            for line in range(1, rng.choices([2, 3, 4], weights=[7, 2, 1])[0]):
                # Higher equipment share and heavier discounts in Sep/Oct deliberately challenge margin.
                product = rng.choices(PRODUCTS, weights=[27 if month >= 9 else 15, 18, 22, 18, 14, 13])[0]
                qty = rng.randint(1, 7)
                discount = rng.choice([0, 300, 500, 800]) + (900 if month >= 9 and product["category"] == "Equipamentos" else 0)
                rows.append({"event_id": f"E-{order_id}-{line}", "item_id": f"{order_id}-{line}", "order_id": order_id,
                    "date": f"2026-{month:02}-{rng.randint(1, calendar.monthrange(2026, month)[1]):02}",
                    "customer_id": customer["id"], "product_id": product["id"],
                    "channel": "Distribuidor" if customer["segment"] == "Enterprise" else "Direto",
                    "quantity": qty, "returned_qty": 1 if rng.random() < (.09 if month >= 9 else .03) else 0,
                    "list_price_cents": product["price"], "discount_bps": discount,
                    "unit_cost_cents": product["cost"] * (108 if month >= 9 else 100) // 100,
                    "updated_at": "2026-11-01T00:00:00Z", "action": "upsert"})
    baseline = list(rows)
    for i, original in enumerate(rows[:18]):
        baseline.append(dict(original, event_id=f"DUP-{i}"))
    mutations = [("quantity", 0), ("customer_id", "UNKNOWN"), ("discount_bps", 12000), ("date", "2026-02-31"), ("unit_cost_cents", -1)]
    for group, (field, bad) in enumerate(mutations):
        for i in range(5):
            baseline.append(dict(rows[i], event_id=f"BAD-{group}-{i}", item_id=f"BAD-{group}-{i}", **{field: bad}))
    corrections = [dict(row, event_id=f"CORRECT-{i}", updated_at="2026-11-02T00:00:00Z",
                        returned_qty=min(row["quantity"], row["returned_qty"] + 1)) for i, row in enumerate(rows[:5])]
    corrections.append(dict(rows[6], event_id="LATE-1", item_id="SO-LATE-1-1", order_id="SO-LATE-1",
                            date="2026-03-15", updated_at="2026-11-02T00:00:00Z"))
    corrections.append(dict(rows[7], event_id="DELETE-1", action="delete", updated_at="2026-11-02T00:00:00Z"))
    corrections.append(dict(rows[0], event_id="STALE-1", updated_at="2026-10-01T00:00:00Z"))
    save(folder / "dimensions.json", dims)
    save(folder / "baseline.json", baseline)
    save(folder / "corrections.json", corrections)
    return dims, baseline, corrections


def validate(row, customers, products):
    errors = []
    for key in ["event_id", "item_id", "order_id"]:
        if not isinstance(row.get(key), str) or not row[key].strip():
            errors.append(f"missing_{key}")
    try:
        if len(row["date"]) != 10:
            raise ValueError()
        date.fromisoformat(row["date"])
    except (KeyError, TypeError, ValueError):
        errors.append("invalid_date")
    try:
        if not row["updated_at"].endswith("Z"):
            raise ValueError()
        datetime.strptime(row["updated_at"], "%Y-%m-%dT%H:%M:%SZ")
    except (KeyError, TypeError, ValueError, AttributeError):
        errors.append("invalid_updated_at")
    if row.get("customer_id") not in customers:
        errors.append("unknown_customer")
    if row.get("product_id") not in products:
        errors.append("unknown_product")
    for key, low, high in [("quantity", 1, 100000), ("returned_qty", 0, row.get("quantity", 0)),
                            ("list_price_cents", 0, 10**10), ("unit_cost_cents", 0, 10**10), ("discount_bps", 0, 10000)]:
        value = row.get(key)
        if type(value) is not int or type(high) is not int or not low <= value <= high:
            errors.append(f"invalid_{key}")
    if row.get("channel") not in ["Direto", "Distribuidor"]:
        errors.append("invalid_channel")
    if row.get("action") not in ["upsert", "delete"]:
        errors.append("invalid_action")
    return errors


def fact(row, customers, products):
    # Round half-up at unit level, then multiply; returned units reverse revenue AND direct cost.
    unit = (row["list_price_cents"] * (10000 - row["discount_bps"]) + 5000) // 10000
    net_units = row["quantity"] - row["returned_qty"]
    gross = row["quantity"] * row["list_price_cents"]
    discount = row["quantity"] * (row["list_price_cents"] - unit)
    refund = row["returned_qty"] * unit
    revenue, cost = net_units * unit, net_units * row["unit_cost_cents"]
    return {**row, "category": products[row["product_id"]]["category"],
            "product": products[row["product_id"]]["name"], "customer": customers[row["customer_id"]]["name"],
            "region": customers[row["customer_id"]]["region"], "segment": customers[row["customer_id"]]["segment"],
            "gross_cents": gross, "discount_cents": discount, "refund_cents": refund,
            "revenue_cents": revenue, "cost_cents": cost, "profit_cents": revenue - cost}


def _run(events, dims, output, *, fail_before_publish=False):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    pointer_path = output / "current.json"
    old_pointer_bytes = pointer_path.read_bytes() if pointer_path.exists() else None
    previous = json.loads(old_pointer_bytes) if old_pointer_bytes else None
    state = json.loads((output / previous["path"] / "state.json").read_text(encoding="utf-8")) if previous else {"items": {}, "seen": {}, "quarantine": [], "stale": 0, "duplicates": 0}
    customers = {r["id"]: r for r in dims["customers"]}
    products = {r["id"]: r for r in dims["products"]}
    if len(customers) != len(dims["customers"]) or len(products) != len(dims["products"]):
        raise ValueError("Dimension keys must be unique")
    for row in events:
        event_id = row.get("event_id")
        fingerprint = digest(row)
        if event_id in state["seen"]:
            if state["seen"][event_id] != fingerprint:
                raise ValueError(f"Conflicting replay of event {event_id}")
            continue
        errors = validate(row, customers, products)
        if not errors:
            old = state["items"].get(row["item_id"])
            if old and row["updated_at"] < old["updated_at"]:
                state["stale"] += 1
            elif old and row["updated_at"] == old["updated_at"]:
                if {k: v for k, v in old.items() if k != "event_id"} == {k: v for k, v in row.items() if k != "event_id"}:
                    errors.append("duplicate_item_version")
                    state["duplicates"] += 1
                else:
                    errors.append("conflicting_item_version")
            else:
                state["items"][row["item_id"]] = row
        if errors:
            state["quarantine"].append({"event": row, "reasons": errors})
        state["seen"][event_id if event_id else f"invalid-{fingerprint}"] = fingerprint
    run_id = digest({"version": VERSION, "state": state, "dimensions": dims})[:16]
    relative = f"runs/{run_id}"
    destination = output / relative
    if previous and previous["run_id"] == run_id:
        return json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
    staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=output))
    try:
        rows = [fact(row, customers, products) for _, row in sorted(state["items"].items()) if row["action"] != "delete"]
        with closing(sqlite3.connect(staging / "warehouse.sqlite")) as db, db:
            db.execute("CREATE TABLE dim_customer (customer_id TEXT PRIMARY KEY, name TEXT, region TEXT, segment TEXT)")
            db.executemany("INSERT INTO dim_customer VALUES (?,?,?,?)", [(r["id"], r["name"], r["region"], r["segment"]) for r in dims["customers"]])
            db.execute("CREATE TABLE dim_product (product_id TEXT PRIMARY KEY, name TEXT, category TEXT)")
            db.executemany("INSERT INTO dim_product VALUES (?,?,?)", [(r["id"], r["name"], r["category"]) for r in dims["products"]])
            db.execute("PRAGMA foreign_keys=ON")
            db.execute("CREATE TABLE fact_sales (item_id TEXT PRIMARY KEY, order_id TEXT, date TEXT, customer_id TEXT REFERENCES dim_customer(customer_id), product_id TEXT REFERENCES dim_product(product_id), revenue_cents INTEGER, cost_cents INTEGER, profit_cents INTEGER)")
            db.executemany("INSERT INTO fact_sales VALUES (?,?,?,?,?,?,?,?)", [(r["item_id"], r["order_id"], r["date"], r["customer_id"], r["product_id"], r["revenue_cents"], r["cost_cents"], r["profit_cents"]) for r in rows])
            sql_totals = db.execute("SELECT COALESCE(SUM(revenue_cents),0), COALESCE(SUM(cost_cents),0), COALESCE(SUM(profit_cents),0),COUNT(*),COUNT(DISTINCT order_id) FROM fact_sales").fetchone()
            if db.execute("PRAGMA foreign_key_check").fetchall():
                raise ValueError("Foreign key reconciliation failed")
        totals = {k: sum(r[k] for r in rows) for k in ["gross_cents", "discount_cents", "refund_cents", "revenue_cents", "cost_cents", "profit_cents"]}
        if tuple(totals[k] for k in ["revenue_cents", "cost_cents", "profit_cents"]) != sql_totals[:3]:
            raise ValueError("SQL / export reconciliation failed")
        if totals["gross_cents"] - totals["discount_cents"] - totals["refund_cents"] != totals["revenue_cents"] or totals["revenue_cents"] - totals["cost_cents"] != totals["profit_cents"]:
            raise ValueError("Financial reconciliation failed")
        manifest = {"version": VERSION, "run_id": run_id, "synthetic": True, "as_of": "2026-11-02",
                    "grain": "one active sales order item", "items": len(rows), "orders": sql_totals[4],
                    "customers": len({r["customer_id"] for r in rows}), "events_seen": len(state["seen"]),
                    "quarantined": len(state["quarantine"]), "stale_events_ignored": state["stale"],
                    "deleted_items": sum(r["action"] == "delete" for r in state["items"].values()),
                    "rules": dict(Counter(reason for q in state["quarantine"] for reason in q["reasons"])),
                    "totals": totals, "state_sha256": digest(state), "dimensions_sha256": digest(dims),
                    "checks": {"sql_export_reconciled": True, "financial_identity": True, "foreign_keys": True, "unique_items": len(rows) == len({r["item_id"] for r in rows})}}
        save(staging / "sales.json", rows)
        save(staging / "state.json", state)
        save(staging / "manifest.json", manifest)
        save(staging / "quarantine.json", state["quarantine"])
        with (staging / "sales.csv").open("w", encoding="utf-8", newline="") as handle:
            fields = list(rows[0]) if rows else ["item_id", "revenue_cents", "cost_cents", "profit_cents"]
            writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
        manifest["files"] = {name: hashlib.sha256((staging / name).read_bytes()).hexdigest() for name in ["sales.json", "sales.csv", "quarantine.json", "state.json"]}
        save(staging / "manifest.json", manifest)
        history = list(previous.get("history", [])) if previous else []
        history.append({"run_id": run_id, "items": len(rows), "events_seen": len(state["seen"]), "quarantined": len(state["quarantine"]), "revenue_cents": totals["revenue_cents"]})
        if fail_before_publish:
            raise RuntimeError("Injected failure before atomic publication")
        # Single-writer optimistic lease: fail safely if another writer published during this run.
        if (pointer_path.read_bytes() if pointer_path.exists() else None) != old_pointer_bytes:
            raise RuntimeError("Concurrent publication; retry against current snapshot")
        if not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            staging.rename(destination)
        else:
            existing = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
            if existing != manifest:
                raise ValueError("Immutable snapshot collision")
        pointer_temp = output / f".current-{run_id}.json"
        save(pointer_temp, {"run_id": run_id, "path": relative, "history": history})
        os.replace(pointer_temp, pointer_path)
        return manifest
    finally:
        if staging.exists() and staging.resolve().parent == output.resolve():
            shutil.rmtree(staging)


def run(events, dims, output, *, fail_before_publish=False):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    lock = output / ".writer.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise RuntimeError("Writer lock exists; stop the other writer or inspect a stale lock before retrying") from exc
    try:
        os.write(descriptor, str(os.getpid()).encode())
        return _run(events, dims, output, fail_before_publish=fail_before_publish)
    finally:
        os.close(descriptor)
        lock.unlink()


def demo(raw, output):
    dims, baseline, corrections = fixture(raw)
    first = run(baseline, dims, output)
    corrected = run(corrections, dims, output)
    replay = run(corrections, dims, output)
    save(output / "demo-evidence.json", {"baseline": first, "corrected": corrected,
        "replay_same_snapshot": corrected["run_id"] == replay["run_id"],
        "changed_revenue_cents": corrected["totals"]["revenue_cents"] - first["totals"]["revenue_cents"],
        "correction_events": corrections})
    return corrected


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--source", type=Path)
    parser.add_argument("--dimensions", type=Path, default=ROOT / "data/commercial/raw/dimensions.json")
    parser.add_argument("--output", type=Path, default=ROOT / "data/commercial")
    args = parser.parse_args()
    if args.demo:
        # A fresh destination reproduces the baseline → corrected → replay evidence.
        if (args.output / "current.json").exists():
            raise SystemExit("Use a fresh --output for --demo; existing publication is preserved.")
        result = demo(args.output / "raw", args.output)
    elif args.source:
        result = run(json.loads(args.source.read_text(encoding="utf-8")), json.loads(args.dimensions.read_text(encoding="utf-8")), args.output)
    else:
        parser.error("Choose --demo or --source")
    print(json.dumps(result, ensure_ascii=False, indent=2))
