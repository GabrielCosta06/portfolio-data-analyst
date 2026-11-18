# CVM filing revision tracker

This case compares consolidated DRE figures for the exact fiscal period January 1 to December 31, 2024. It covers AXIA Energia, Neoenergia and WEG using the official 2024 and 2025 DFP archives. The 2024 archive supplies its current-period column. The 2025 archive supplies its prior-period column.

The CVM submission history preserves document versions, IDs and receipt dates. The archive's DRE extract supplies the amount rows for the available versions. The demo labels the document pair used for a numerical comparison and shows the full submission timeline separately. The importer also supports comparisons across captured snapshots containing different versions of the same filing date.

## Reproduce the evidence

Run from the repository root with Python 3.10+:

```sh
python src/cvm_tracker.py --check
```

The checked-in [extracts](data/) carry SHA-256 fingerprints of the official archives, capture dates, CSV member names and source row numbers. [Comparison JSON](../../evidence/cvm-filing-diffs.json) contains exact amount differences, label edits and added or removed account codes.

To extend the capture history in a local directory:

```sh
python src/cvm_tracker.py --capture 2024 --snapshots ./cvm-snapshots
python src/cvm_tracker.py --capture 2025 --snapshots ./cvm-snapshots
python src/cvm_tracker.py --snapshots ./cvm-snapshots --report ./cvm-diffs.json
```

Use `--archive PATH` with `--capture` to ingest a previously downloaded official ZIP. Repeated bytes keep the first capture. New archive hashes create separate snapshots. The comparison retains distinct document disclosures, joins on account code and normalizes BRL units and thousands to cents. It excludes per-share lines. Added or removed codes have no numeric delta. Subtotal and detail rows overlap.

## Source and license

CVM (Comissão de Valores Mobiliários), [DFP open data](https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp). The captured data and derived comparisons are shared under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Project code uses the repository MIT license.
