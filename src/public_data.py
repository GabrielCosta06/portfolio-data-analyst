"""Pin and validate a small Brazil extract of the OWID CO2 dataset. No live browser API."""
import argparse
import csv
import hashlib
import io
import json
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ["year", "population", "co2", "co2_per_capita", "co2_including_luc", "co2_including_luc_per_capita"]


def build(folder, refresh=False):
    folder.mkdir(parents=True, exist_ok=True)
    source = folder / "brazil.csv"
    metadata_path = folder / "source.json"
    if refresh:
        commit = subprocess.check_output(["git", "ls-remote", "https://github.com/owid/co2-data.git", "HEAD"], text=True, timeout=30).split()[0]
        url = f"https://raw.githubusercontent.com/owid/co2-data/{commit}/owid-co2-data.csv"
        with urllib.request.urlopen(url, timeout=60) as response:
            raw = response.read()
        selected = [{key: row[key] for key in FIELDS} for row in csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
                    if row["country"] == "Brazil" and 2000 <= int(row["year"]) <= 2024]
        if not selected:
            raise ValueError("Source did not return Brazil records")
        content = io.StringIO(newline="")
        writer = csv.DictWriter(content, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(selected)
        source.write_text(content.getvalue(), encoding="utf-8", newline="")
        metadata = {"publisher": "Our World in Data", "dataset": "CO2 and Greenhouse Gas Emissions",
            "repository": "https://github.com/owid/co2-data", "commit": commit, "url": url,
            "codebook": f"https://github.com/owid/co2-data/blob/{commit}/owid-co2-codebook.csv",
            "retrieved_at": datetime.now(timezone.utc).isoformat(), "upstream_sha256": hashlib.sha256(raw).hexdigest(),
            "extract_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "selection": "country=Brazil; 2000<=year<=2024; six named columns; source values preserved",
            "attribution": "Our World in Data; underlying emissions: Global Carbon Budget; population: OWID population sources. See the pinned codebook for original-source attribution and licenses.",
            "license": "OWID-produced data: CC BY 4.0; third-party data retain original-source terms. See the upstream README and codebook."}
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if hashlib.sha256(source.read_bytes()).hexdigest() != metadata["extract_sha256"]:
        raise ValueError("Public extract hash mismatch")
    rows = []
    seen = set()
    for raw in csv.DictReader(io.StringIO(source.read_text(encoding="utf-8"))):
        row = {key: (int(raw[key]) if key in ["year", "population"] else float(raw[key])) if raw[key] else None for key in FIELDS}
        if row["year"] in seen:
            raise ValueError("Duplicate country-year")
        seen.add(row["year"])
        if row["population"] is None or row["population"] <= 0:
            raise ValueError("Missing/nonpositive population")
        if row["co2"] is not None and row["co2_per_capita"] is not None:
            if abs(row["co2"] * 1_000_000 / row["population"] - row["co2_per_capita"]) > .02:
                raise ValueError("Per-capita units do not reconcile within source rounding")
        rows.append(row)
    rows.sort(key=lambda row: row["year"])
    if [row["year"] for row in rows] != list(range(2000, 2025)):
        raise ValueError("Expected complete annual coverage 2000–2024")
    data = {"source": metadata, "rows": rows, "checks": {"unique_years": True, "annual_coverage": True,
            "per_capita_units": True, "missing_values": sum(r[k] is None for r in rows for k in FIELDS)}}
    (folder / "brazil.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Fetch a new pinned upstream snapshot; explicitly review resulting changes")
    args = parser.parse_args()
    result = build(ROOT / "data/public", args.refresh)
    print(json.dumps({"checks": result["checks"], "commit": result["source"]["commit"], "rows": len(result["rows"])}, indent=2))
