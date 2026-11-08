-- SQLite. Execute against data/processed/warehouse.sqlite.
-- All checks should return no records. Grain: one order line per order_id.
SELECT order_id, COUNT(*) FROM fact_sales GROUP BY order_id HAVING COUNT(*) > 1;
SELECT * FROM fact_sales WHERE quantity <= 0 OR revenue_cents < 0 OR cost_cents < 0;
SELECT * FROM fact_sales WHERE profit_cents <> revenue_cents - cost_cents;
SELECT * FROM fact_sales WHERE date(order_date) IS NULL;
-- Reconciliation to the published JSON manifest, independently computed in SQL:
SELECT COUNT(*) AS orders, SUM(revenue_cents) AS revenue_cents,
       SUM(profit_cents) AS profit_cents FROM fact_sales;
