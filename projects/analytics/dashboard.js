import {count, currency, english, loadError, node, percent, readJSON, renderBars} from '../../assets/case-data.js';

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
const metricButtons = [...document.querySelectorAll('[data-metric]')];
let source = [];
let selected = [];
let months = [];
let currentMetric = 'revenue';

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
  const insight = $('insight');
  insight.hidden = !groups.length;
  insight.replaceChildren();
  if (!groups.length) return;
  const profitLeader = groups.reduce((best, group) => group.profit > best.profit ? group : best);
  const revenueLeader = groups[0];
  const revenueNote = copy(
    `${labelFor(revenueLeader.name)} leads in revenue (${formatMetric('revenue', revenueLeader.revenue)}).`,
    `${labelFor(revenueLeader.name)} lidera em receita (${formatMetric('revenue', revenueLeader.revenue)}).`,
  );
  const profitNote = copy(
    `${labelFor(profitLeader.name)} contributes the most gross profit (${formatMetric('profit', profitLeader.profit)}).`,
    `${labelFor(profitLeader.name)} mais contribui para o lucro bruto (${formatMetric('profit', profitLeader.profit)}).`,
  );
  insight.append(node('p', revenueNote), node('p', profitNote));
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
    .map(name => ({name, ...summarize(selected.filter(row => row.Category === name))}))
    .sort((a, b) => b.revenue - a.revenue);
  renderCategories(categories);
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
  render();
}).catch(() => {
  $('results-summary').textContent = loadError;
});
