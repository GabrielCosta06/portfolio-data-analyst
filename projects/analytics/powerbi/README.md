# Power BI companion — original sales case

[Download the corrected portable project](../../../start/PowerBI-pronto.zip). [Desktop execution evidence](../../../evidence/powerbi-validation.json). Editable [PBIP/PBIR source](project/).

This is the original 600-order January–June 2026 synthetic fixture, separate from the new Commercial Intelligence mart. Its totals are intentionally different. Delivered as PBIP/PBIR, not an exported PBIX.

On 2026-11-12 the corrected project opened in the installed Power BI Desktop, embedded Power Query M queries refreshed, and DAX queries executed against its local Analysis Services engine. Full and filtered results reconciled. `Total Revenue` and `Total Cost` replace measures that previously collided with the `Revenue` and `Cost` columns. Dependent DAX and PBIR bindings were updated.

**Visual layout verification remains pending.** The Windows session was locked; OS captures showed the lock screen or blank content and were rejected. Desktop opening, refresh and DAX execution do not establish that every visual renders correctly. No screenshot or PBIX rendering claim is made.

## Open and reconcile

1. Extract the ZIP and open `PowerBI/Vendas.pbip`, preserving the adjacent report/model directories.
2. Click **Refresh**. Data is embedded in M; no credentials, uploads or paths are required.
3. Check unfiltered revenue **728,800**, direct cost **420,300**, gross profit **308,500**, weighted gross margin **42.3298573%**, orders **600** (BRL).
4. Filter `Category=Servicos`, `MonthLabel=2026-06`: revenue **43,290**, gross profit **24,290**, orders **34**.

`DimDate[Date] → FactSales[Date]` is a single-direction one-to-many relationship. Money imports as fixed decimal, dates as dates, with en-US parsing. Margin uses `DIVIDE`, never sums row percentages. The full fixture is also available as [CSV](../../../data/processed/fact_sales.csv).

For manual authoring, [queries.pq](queries.pq) accepts a `DataFolder` parameter and [measures.dax](measures.dax) provides the corrected measures. The portable project uses embedded queries instead. [Build script](../../../src/build_powerbi.py) verifies model-name uniqueness and report bindings before creating a deterministic ZIP.

Grain: one order line per OrderId. No taxes, returns, freight or discounts in this original study. No employer data. Generated with AI assistance.
