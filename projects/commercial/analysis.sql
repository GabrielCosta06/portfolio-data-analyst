-- Snapshot SQLite mart; one active order item. Money is integer cents.
-- Revenue and profit contribution, weighted margin, and revenue rank per category.
WITH category AS (
 SELECT p.category, COUNT(DISTINCT s.order_id) AS orders,
        SUM(s.revenue_cents) AS revenue_cents, SUM(s.profit_cents) AS profit_cents
 FROM fact_sales s JOIN dim_product p USING (product_id)
 GROUP BY p.category
)
SELECT *, ROUND(100.0 * profit_cents / NULLIF(revenue_cents, 0), 2) AS margin_pct,
       RANK() OVER (ORDER BY revenue_cents DESC) AS revenue_rank,
       RANK() OVER (ORDER BY profit_cents DESC) AS profit_rank
FROM category ORDER BY revenue_cents DESC;

-- Month-over-month comparison; full calendar months only.
WITH monthly AS (
 SELECT substr(date,1,7) AS month, SUM(revenue_cents) AS revenue_cents,
        SUM(profit_cents) AS profit_cents FROM fact_sales GROUP BY substr(date,1,7)
), previous AS (
 SELECT *, LAG(revenue_cents) OVER (ORDER BY month) AS previous_revenue,
        LAG(1.0*profit_cents/NULLIF(revenue_cents,0)) OVER (ORDER BY month) AS previous_margin
 FROM monthly
)
SELECT month, revenue_cents,
       ROUND(100.0*(revenue_cents-previous_revenue)/NULLIF(previous_revenue,0),2) AS revenue_growth_pct,
       ROUND(100.0*(1.0*profit_cents/NULLIF(revenue_cents,0)-previous_margin),2) AS margin_change_pp
FROM previous ORDER BY month;

-- Customer gross contribution (excludes acquisition/servicing overhead).
SELECT c.customer_id,c.name,c.segment,SUM(s.revenue_cents) AS revenue_cents,
       SUM(s.profit_cents) AS profit_cents,
       ROUND(100.0*SUM(s.profit_cents)/NULLIF(SUM(s.revenue_cents),0),2) AS margin_pct
FROM fact_sales s JOIN dim_customer c USING(customer_id)
GROUP BY c.customer_id,c.name,c.segment ORDER BY revenue_cents DESC;

-- Empty result is the expected reconciliation outcome.
SELECT item_id FROM fact_sales WHERE revenue_cents-cost_cents <> profit_cents;
