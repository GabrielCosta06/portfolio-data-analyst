-- Execute no mesmo catálogo usado pelo notebook.
SELECT 'bronze' AS camada, COUNT(*) AS linhas FROM portfolio_gabriel_demo_20261108.bronze
UNION ALL SELECT 'silver', COUNT(*) FROM portfolio_gabriel_demo_20261108.silver
UNION ALL SELECT 'quarantine', COUNT(*) FROM portfolio_gabriel_demo_20261108.quarantine
UNION ALL SELECT 'gold', COUNT(*) FROM portfolio_gabriel_demo_20261108.gold;
-- Esperado: Bronze 670, Silver 600, Quarantine 70, Gold 6.
SELECT COUNT(DISTINCT order_id) AS pedidos, SUM(revenue) AS receita,
       SUM(direct_cost) AS custo_direto, SUM(gross_profit) AS lucro_bruto
FROM portfolio_gabriel_demo_20261108.silver;
-- Esperado: 600 / 728800.00 / 420300.00 / 308500.00 (dados sintéticos).
SELECT reasons, COUNT(*) AS linhas
FROM portfolio_gabriel_demo_20261108.quarantine GROUP BY reasons ORDER BY reasons;
