-- GoogleSQL. The dataset is in the project used to run the query.
-- The half-open date range covers all six months in the synthetic fixture.
WITH monthly AS (
  SELECT
    DATE_TRUNC(order_date, MONTH) AS sales_month,
    COUNT(*) AS orders,
    SUM(revenue) AS revenue,
    SUM(cost) AS direct_cost,
    SUM(profit) AS gross_profit
  FROM `portfolio_demo.fact_sales_bigquery`
  WHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-07-01'
  GROUP BY sales_month
),
with_previous AS (
  SELECT
    *,
    LAG(sales_month) OVER (ORDER BY sales_month) AS previous_month,
    LAG(revenue) OVER (ORDER BY sales_month) AS previous_revenue
  FROM monthly
)
SELECT
  sales_month,
  orders,
  revenue,
  direct_cost,
  gross_profit,
  ROUND(100 * SAFE_DIVIDE(gross_profit, revenue), 2) AS gross_margin_pct,
  CASE
    WHEN DATE_DIFF(sales_month, previous_month, MONTH) = 1
    THEN ROUND(100 * SAFE_DIVIDE(revenue - previous_revenue, previous_revenue), 2)
  END AS revenue_growth_pct
FROM with_previous
ORDER BY sales_month;
