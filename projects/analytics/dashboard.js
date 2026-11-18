import {count, currency, english, loadError, node, percent, readJSON, renderBars} from '../../assets/case-data.js';
import {compareCategories, rankCategories} from './decision.mjs';

const $ = id => document.getElementById(id);
const copy = (en, pt) => english ? en : pt;
const labels = {
  Consumiveis: copy('Consumables', 'Consumíveis'),
  Equipamentos: copy('Equipment', 'Equipamentos'),
  Servicos: copy('Services', 'Serviços'),
  'Centro-Oeste': copy('Central-West', 'Centro-Oeste'),
  Nordeste: copy('Northeast', 'Nordeste'),
  Sudeste: copy('Southeast', 'Sudeste'),
  Sul: copy('South', 'Sul'),
  Direto: copy('Direct', 'Direto'),
  Distribuidor: copy('Distributor', 'Distribuidor'),
};
const labelFor = value => labels[value] ?? value;
const cents = value => Math.round(Number(value) * 100);
const monthOf = row => row.Date.slice(0, 7);
const dimensions = [
  [$('category'), row => row.Category],
  [$('region'), row => row.Region],
  [$('channel'), row => row.Channel],
];
const monthFilter = $('month');
const categoryFilter = $('category');
const ranking = $('category-ranking');
const investigate = $('investigate-category');
const metricButtons = [...document.querySelectorAll('[data-metric]')];
let source = [];
let selected = [];
let months = [];
let currentMetric = 'revenue';
let priorityCategory = null;

function summarize(rows) {
  let revenue = 0;
  let profit = 0;
  for (const row of rows) {
    revenue += cents(row.Revenue);
    profit += cents(row.Profit);
  }
  return {revenue, profit, margin: revenue ? profit / revenue : null};
}

function formatMetric(metric, value) {
  if (value === null) return '–';
  return metric === 'margin' ? percent.format(value) : currency.format(value / 100);
}

function renderCategories(groups) {
  const table = $('categories');
  table.replaceChildren();
  for (const group of groups) {
    const row = node('tr');
    const header = node('th', labelFor(group.name));
    header.scope = 'row';
    row.append(header);
    for (const metric of ['revenue', 'profit', 'margin']) {
      row.append(node('td', formatMetric(metric, group[metric])));
    }
    table.append(row);
  }
}

function renderDecision(groups, margin) {
  const {leaders, priority} = compareCategories(groups, margin);
  for (const [metric, top] of Object.entries(leaders)) {
    const names = top.map(group => labelFor(group.name)).join(' / ');
    $(`leader-${metric}`).textContent = top.length ? names + ' · ' + formatMetric(metric, top[0][metric]) : '–';
  }
  priorityCategory = priority?.name ?? null;
  const insight = $('insight');
  if (priority) {
    const name = labelFor(priority.name);
    const categoryMargin = percent.format(priority.margin);
    const benchmark = percent.format(margin);
    const gap = currency.format(priority.gapCents / 100);
    insight.textContent = copy(
      `Investigate ${name} first. Its margin is ${categoryMargin}, compared with ${benchmark} for the selection. At the same revenue and the selection’s margin, gross profit would be ${gap} higher. Check direct costs and product mix by region and channel. Confirm discounts and returns in the source system before acting.`,
      `Investigue ${name} primeiro. A margem é de ${categoryMargin}, ante ${benchmark} no recorte. Com a mesma receita e a margem do recorte, o lucro bruto seria ${gap} maior. Confira custos diretos e mix por região e canal. Antes de agir, valide descontos e devoluções no sistema de origem.`,
    );
  } else {
    insight.textContent = groups.length < 2
      ? copy('Include at least two categories with orders to make a comparison.', 'Inclua pelo menos duas categorias com pedidos para comparar.')
      : copy('No category has a positive profit gap against the current benchmark.', 'Nenhuma categoria tem diferença positiva de lucro em relação à referência atual.');
  }
  investigate.hidden = !priority && !categoryFilter.value;
  investigate.textContent = categoryFilter.value
    ? copy('Compare all categories', 'Comparar todas as categorias')
    : copy('Investigate this category', 'Investigar esta categoria');
}

function render(focusMonth) {
  const trendRows = source.filter(row => dimensions.every(([select, value]) => !select.value || value(row) === select.value));
  selected = trendRows.filter(row => !monthFilter.value || monthOf(row) === monthFilter.value);
  const total = summarize(selected);
  for (const metric of ['revenue', 'profit', 'margin']) $(metric).textContent = formatMetric(metric, total[metric]);
  $('orders').textContent = count.format(new Set(selected.map(row => row.OrderId)).size);
  $('export').disabled = !selected.length;
  $('results-summary').textContent = selected.length
    ? copy(
      `${count.format(selected.length)} of ${count.format(source.length)} valid orders in the current selection.`,
      `${count.format(selected.length)} de ${count.format(source.length)} pedidos válidos no recorte selecionado.`,
    )
    : copy('No orders match these filters.', 'Nenhum pedido corresponde aos filtros.');

  const categories = [...new Set(selected.map(row => row.Category))]
    .map(name => ({name, ...summarize(selected.filter(row => row.Category === name))}));
  renderCategories(rankCategories(categories, ranking.value));
  renderDecision(categories, total.margin);
  const chartRows = months.map(month => {
    const orders = trendRows.filter(row => monthOf(row) === month);
    const value = orders.length ? summarize(orders)[currentMetric] : null;
    return {key: month, label: month, value, formatted: formatMetric(currentMetric, value)};
  });
  const monthButtons = renderBars($('monthly-chart'), chartRows, {
    activeKey: monthFilter.value,
    onSelect: month => {
      monthFilter.value = monthFilter.value === month ? '' : month;
      render(month);
    },
  });
  if (focusMonth) monthButtons.get(focusMonth)?.focus({preventScroll: true});
}

function exportSelection() {
  if (!selected.length) return;
  const columns = Object.keys(selected[0]);
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  const lines = [columns, ...selected.map(row => columns.map(key => row[key]))];
  const csv = lines.map(line => line.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], {type: 'text/csv;charset=utf-8'}));
  const link = node('a');
  link.href = url;
  link.download = 'sales-selection-synthetic.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

readJSON('data/processed/sales.json').then(rows => {
  source = rows;
  months = [...new Set(rows.map(monthOf))].sort();
  for (const [select, getValue] of [...dimensions, [monthFilter, monthOf]]) {
    const options = [...new Set(rows.map(getValue))].sort();
    for (const value of options) {
      const option = node('option', labelFor(value));
      option.value = value;
      select.append(option);
    }
    select.disabled = false;
    select.addEventListener('change', () => render());
  }
  for (const button of metricButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      currentMetric = button.dataset.metric;
      for (const choice of metricButtons) {
        choice.setAttribute('aria-pressed', String(choice.dataset.metric === currentMetric));
      }
      render();
    });
  }
  $('reset').disabled = false;
  $('reset').addEventListener('click', () => {
    for (const [select] of dimensions) select.value = '';
    monthFilter.value = '';
    render();
  });
  $('export').addEventListener('click', exportSelection);
  ranking.disabled = false;
  ranking.addEventListener('change', () => render());
  investigate.addEventListener('click', () => {
    categoryFilter.value = categoryFilter.value ? '' : priorityCategory ?? '';
    render();
    categoryFilter.focus();
  });
  render();
}).catch(() => {
  $('results-summary').textContent = loadError;
});
