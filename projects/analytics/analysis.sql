-- Monetary calculations remain integer cents until presentation.
SELECT category, COUNT(*) AS orders, SUM(quantity) AS units,
       SUM(revenue_cents)/100.0 AS revenue,
       SUM(profit_cents)/100.0 AS gross_profit,
       ROUND(100.0*SUM(profit_cents)/NULLIF(SUM(revenue_cents),0),2) AS gross_margin_pct
FROM fact_sales GROUP BY category ORDER BY revenue DESC;

-- Month-over-month growth: window function avoids a self-join.
WITH monthly AS (
 SELECT substr(order_date,1,7) AS month,SUM(revenue_cents) AS revenue
 FROM fact_sales GROUP BY substr(order_date,1,7)
), previous AS (
 SELECT *,LAG(revenue) OVER(ORDER BY month) AS previous_revenue FROM monthly
)
SELECT month,revenue/100.0 AS revenue,
 ROUND(100.0*(revenue-previous_revenue)/NULLIF(previous_revenue,0),2) AS growth_pct
FROM previous ORDER BY month;
