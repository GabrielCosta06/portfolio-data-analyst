# Commercial Intelligence

One data product, two equal paths: [analysis](../projects/commercial/#analysis) and [engineering](../projects/commercial/#engineering). [Português](#português).

## Business question

Why can revenue rise while gross margin falls? The synthetic January–October 2026 fixture includes 48 customers, six products, multiple items per order, discounts, returns and changing direct costs. September and October deliberately combine a higher equipment mix, higher equipment discounts and an 8% cost increase. These are known simulation mechanisms, not discovered causes in a real company.

The published corrected snapshot contains 2,645 active items across 1,889 orders. Net revenue is BRL 7,204,974.50, direct cost BRL 4,245,635.04 and gross profit BRL 2,959,339.46. Every KPI, chart, table and CSV selection uses the same rows. The browser verifies the sales JSON SHA-256 when Web Crypto is available and checks totals against the manifest.

### Interpretation

Use weighted margin and gross contribution alongside revenue. The initial-to-final month comparison is descriptive: it combines changes in mix, discounts, returns and costs. It does not estimate an isolated price or volume effect. Compare categories/channels, investigate discount exceptions, and evaluate a proposed discount policy with the arithmetic scenario before considering a real-world experiment. No claimed employer impact or realized financial benefit.

The scenario applies an additional discount to the selected **net** revenue and a percentage change to selected direct cost, rounding totals to cents. It holds volume and returns constant and excludes demand elasticity. The same assumptions apply to negative cost-change scenarios. This is sensitivity analysis, not a forecast.

## Definitions

- Grain: one active order **item**, not one order. Order count is `COUNT(DISTINCT order_id)`.
- `gross = quantity × list_price_cents`.
- `unit_net = round_half_up(list_price_cents × (1 − discount_bps/10000))`, in integer cents.
- `discount = quantity × (list_price_cents − unit_net)`.
- `refund = returned_qty × unit_net`.
- `revenue = gross − discount − refund`.
- `cost = (quantity − returned_qty) × unit_cost_cents`; full direct-cost recovery is assumed for returns.
- `gross_profit = revenue − cost`; margin is `SUM(gross_profit) / SUM(revenue)`, undefined if revenue is zero.

No taxes, freight, servicing costs, acquisition costs or inventory losses. Gross profit is not net profit. The model deliberately simplifies operational accounting.

## Incremental processing

`src/commercial.py` uses Python's standard library. Events have globally unique `event_id`, an `item_id`, an ISO UTC `updated_at`, and `action=upsert|delete`. Dimensions are supplied separately. Validation checks types, ranges, calendar dates, timestamps and customer/product references. Invalid events retain their original payload and all rule reasons.

- Identical replay of an already-seen event does nothing; conflicting payload under the same event ID aborts the run.
- A newer item version replaces the older one. An older timestamp is recorded as stale and ignored.
- An equal timestamp with an equal payload is quarantined as a duplicate version; equal timestamp with different content is quarantined as ambiguous.
- Deletes leave a versioned tombstone so an old update cannot resurrect the item.
- A local exclusive lock rejects a second writer. If a process is forcibly terminated, inspect its PID and confirm it is stopped before manually removing a stale `.writer.lock`.

Each run produces a new SQLite star schema, CSV, JSON, state and quarantine in a staging directory. SQL and export totals, foreign keys and financial identities must agree. The directory then becomes immutable `runs/<content-id>/`; `current.json` is replaced atomically as the final publication step. Readers resolve the pointer once. A failed pre-publication run leaves the previous pointer and all its files untouched. Snapshots are retained for inspection; no automatic retention/deletion policy is implemented.

The content ID includes pipeline version, dimensions and state. The manifest records state/export hashes. A replay publishes neither a new ID nor an extra history entry. History is for successful publications of this local demo, not production observability.

## Reproduce

Python 3.12+ for the complete site builder; the pipeline itself uses standard-library APIs. From the repository root:

```sh
python src/commercial.py --demo --output .local/demo
python -m unittest discover -s tests -v
python src/public_data.py
python src/build_site.py
python -m http.server 8080
```

Use a fresh destination for `--demo`; it intentionally refuses to replace an existing publication. To process another batch against that publication:

```sh
python src/commercial.py --source data/commercial/raw/corrections.json --dimensions data/commercial/raw/dimensions.json --output .local/demo
```

The demo executes baseline → correction batch → replay. See [versioned evidence](../data/commercial/demo-evidence.json), [current pointer](../data/commercial/current.json), [SQL investigations](../projects/commercial/analysis.sql), and [behavioral tests](../tests/test_commercial.py). SQLite is regenerated locally and excluded from Git; its queryable content is reconciled to the versioned exports.

### Quality experiment

The browser lab uses a three-item sample and demonstrates three relevant checks from the Python contract: duplicate item version, negative cost, and unknown customer. It is explicitly a browser simulation, not remote execution of Python. A rejected valid-looking item reduces completeness; the lab never repairs the source automatically. Full pipeline quarantine is independently downloadable.

## Limits

Local filesystem, same volume, single writer, in-memory state. No ERP connection, source CDC, authentication, scheduler, distributed lock, cloud resources, alerting or scale benchmark. Rebuilding the SQLite mart from merged item state is full materialization after incremental event application. This is not an incremental database merge benchmark. Changing master data rematerializes the current view; there is no SCD type 2 history.

The existing Spark/Delta notebook is a separate companion using its original 600-order fixture. Its execution evidence is separate; it does not run this commercial mart. Power BI uses that original fixture too, so its totals must not be compared to this flagship's new totals.

## Português

O estudo tem duas entradas de igual importância: análise comercial e engenharia. A hipótese de margem foi inserida no gerador para demonstrar investigação, não inferência causal. O grão é um item de pedido; pedidos contam IDs distintos. A publicação é um snapshot reproduzível, não uma conexão ao ERP.

O pipeline aplica versões mais recentes, ignora eventos antigos, preserva exclusões e impede duplicação em replay. Contratos e conciliações antecedem a troca de `current.json`. O teste de falha compara o ponteiro e todos os arquivos anteriores byte a byte e comprova o reprocessamento posterior. O laboratório do navegador ilustra três regras; a validação completa é executada em Python.

O simulador mantém volume e devoluções constantes. Lucro bruto exclui impostos, frete e custos de atendimento. Dados sintéticos e assistência de IA são identificados. Spark/Delta e Power BI preservam o estudo complementar original e suas próprias evidências.
