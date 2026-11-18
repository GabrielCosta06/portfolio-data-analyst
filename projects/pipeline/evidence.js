import {count, english, loadError, readJSON} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const copy = (en, pt) => english ? en : pt;
const repoRoot = new URL('../../', import.meta.url);
const stages = {
  bronze: {
    title: 'Bronze',
    describe: copy('Preserves the original extract at source-row grain, including duplicates and invalid values.', 'Preserva a extração original no grão de linha do arquivo, incluindo duplicidades e valores inválidos.'),
    label: copy('Inspect the raw extract', 'Inspecionar o CSV bruto'),
    href: new URL('data/raw/sales.csv', repoRoot),
  },
  silver: {
    title: 'Silver',
    describe: copy('Keeps the first valid row per order ID. Revenue, cost and gross profit reconcile exactly as integer cents in the local warehouse.', 'Mantém a primeira linha válida por pedido. Receita, custo e lucro bruto conciliam exatamente em centavos inteiros no warehouse local.'),
    label: copy('Inspect the accepted fact table', 'Inspecionar a tabela de pedidos válidos'),
    href: new URL('data/processed/fact_sales.csv', repoRoot),
  },
  gold: {
    title: 'Gold',
    describe: copy('Aggregates order count, revenue, cost and profit by month. Weighted margin is calculated from the monthly totals.', 'Consolida pedidos, receita, custo e lucro por mês. A margem ponderada é calculada a partir dos totais mensais.'),
    label: copy('Review the monthly aggregates', 'Conferir os agregados mensais'),
    href: new URL('data/processed/manifest.json', repoRoot),
  },
  quarantine: {
    title: copy('Quarantine', 'Quarentena'),
    describe: copy('Retains each rejected row with its source line and every validation reason. These records are excluded from sales metrics.', 'Preserva cada linha rejeitada com sua linha de origem e todos os motivos. Esses registros ficam fora dos indicadores de vendas.'),
    label: copy('Open the quarantine explorer', 'Abrir o explorador de quarentena'),
    href: new URL('../quality/', location.href),
  },
};
const stageButtons = [...document.querySelectorAll('[data-stage]')];

function showStage(key) {
  const stage = stages[key];
  for (const button of stageButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.stage === key));
  }
  $('stage-title').textContent = stage.title;
  $('stage-description').textContent = stage.describe;
  $('stage-artifact').textContent = stage.label;
  $('stage-artifact').href = stage.href;
}

Promise.all([readJSON('data/processed/manifest.json'), readJSON('evidence/spark-validation.json')])
  .then(([pipeline, spark]) => {
    const rowKeys = ['input_rows', 'accepted_rows', 'quarantined_rows'];
    const cents = value => Math.round(Number(value) * 100);
    const rulesMatch = Object.keys(pipeline.rule_failures).length === Object.keys(spark.rule_counts).length &&
      Object.entries(pipeline.rule_failures).every(([rule, hits]) => spark.rule_counts[rule] === hits);
    const agrees = rowKeys.every(key => pipeline[key] === spark[key]) &&
      pipeline.input_rows === pipeline.accepted_rows + pipeline.quarantined_rows &&
      pipeline.revenue_cents === cents(spark.revenue) &&
      pipeline.cost_cents === cents(spark.direct_cost) &&
      pipeline.profit_cents === cents(spark.gross_profit) && rulesMatch;

    $('bronze-count').textContent = count.format(pipeline.input_rows);
    $('silver-count').textContent = count.format(pipeline.accepted_rows);
    $('gold-count').textContent = count.format(pipeline.monthly.length);
    $('quarantine-count').textContent = count.format(pipeline.quarantined_rows);
    $('lineage-status').textContent = agrees
      ? copy('Row counts, rejection rules and financial totals match across the Python and Spark runs.', 'As contagens, as regras de rejeição e os totais financeiros são iguais nas execuções em Python e Spark.')
      : copy('The Python and Spark evidence differs. Review both run files before using the totals.', 'As evidências em Python e Spark divergem. Confira os dois arquivos de execução antes de usar os totais.');
    for (const button of stageButtons) {
      button.disabled = false;
      button.addEventListener('click', () => showStage(button.dataset.stage));
    }
  })
  .catch(() => { $('lineage-status').textContent = loadError; });
