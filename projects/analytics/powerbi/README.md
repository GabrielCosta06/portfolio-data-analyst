# Power BI companion

This bundle contains real CSV exports, Power Query M and DAX definitions. It is not a PBIX file. Power BI Desktop rendering has not been validated in this delivery.

1. Run `python src/pipeline.py --generate` at repository root.
2. In Power BI Desktop, import `data/processed/fact_sales.csv` as **FactSales** and `dim_date.csv` as **DimDate**, or use the two separate queries in `queries.pq` with a Text parameter **DataFolder**.
3. FactSales types: text dimensions, Date as date, Quantity as whole number, Revenue/Cost/Profit as fixed decimal. Use English (United States) locale when parsing decimal numbers.
4. Create the one-to-many relationship **DimDate[Date] → FactSales[Date]**, single direction. Mark DimDate as the date table and sort MonthLabel by its YYYY-MM value.
5. Add each measure from `measures.dax` separately. Format currencies as BRL and margin/growth as percentages.
6. Add slicers for Category, Region, Channel, and DimDate[MonthLabel]. Use cards for revenue, gross profit, margin, and orders; a monthly revenue column chart and category revenue/margin table.
7. Reconcile unfiltered revenue/profit/order counts with `data/processed/manifest.json`. Never sum row margins; use the weighted DIVIDE measure.

Grain: one synthetic order line per OrderId. There are no taxes, returns, freight or discounts. Gross profit is revenue minus direct product/service cost only. MoM must be interpreted for complete months; arbitrary day filters can create partial-period comparisons. Synthetic categories do not represent an employer's business.
