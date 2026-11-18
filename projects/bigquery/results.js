import {count, currency, english, loadError, locale, node, percent, readJSON, renderBars} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const copy = (en, pt) => english ? en : pt;
const signedPercent = new Intl.NumberFormat(locale, {
  style: 'percent', maximumFractionDigits: 2, signDisplay: 'exceptZero',
});
const dateFormat = new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric', timeZone: 'UTC'});
const margin = row => row.margin_pct === null ? '–' : percent.format(row.margin_pct / 100);
const growth = row => row.growth_pct === null ? '–' : signedPercent.format(row.growth_pct / 100);

function renderDetail(row) {
  const heading = node('h3', dateFormat.format(new Date(row.month + '-01T00:00:00Z')));
  const metrics = node('dl');
  metrics.className = 'record-fields';
  for (const [label, value] of [
    [copy('Weighted margin', 'Margem ponderada'), margin(row)],
    [copy('Gross profit', 'Lucro bruto'), currency.format(row.profit_cents / 100)],
    [copy('Revenue growth', 'Variação da receita'), growth(row)],
  ]) {
    const pair = node('div');
    pair.append(node('dt', label), node('dd', value));
    metrics.append(pair);
  }
  const detail = $('bq-details');
  detail.replaceChildren(heading, metrics);
  if (row.growth_pct === null) {
    detail.append(node('p', copy('There is no previous month in this result set.', 'O resultado não inclui um mês anterior para comparação.')));
  }
  detail.hidden = false;
}

readJSON('data/processed/bigquery-results.json')
  .then(({rows}) => {
    if (!rows.length) {
      $('bq-status').textContent = copy('No monthly results.', 'Nenhum resultado mensal.');
      return;
    }
    for (const row of rows) {
      const tr = node('tr');
      const header = node('th', row.month);
      header.scope = 'row';
      tr.append(header);
      for (const value of [
        count.format(row.orders), currency.format(row.revenue_cents / 100), currency.format(row.profit_cents / 100),
        margin(row), growth(row),
      ]) tr.append(node('td', value));
      $('bq-results').append(tr);
    }
    const chartRows = rows.map(row => ({
      key: row.month,
      label: row.month,
      value: row.revenue_cents,
      formatted: currency.format(row.revenue_cents / 100),
    }));
    function selectMonth(key, restoreFocus = false) {
      const row = rows.find(month => month.month === key);
      renderDetail(row);
      const buttons = renderBars($('bq-chart'), chartRows, {
        onSelect: month => selectMonth(month, true),
        activeKey: key,
      });
      if (restoreFocus) buttons.get(key).focus({preventScroll: true});
    }
    selectMonth(rows[rows.length - 1].month);
    $('bq-status').textContent = copy(
      `${count.format(rows.length)} months reconciled to the pipeline manifest.`,
      `${count.format(rows.length)} meses conciliados com o manifesto do pipeline.`,
    );
  })
  .catch(() => { $('bq-status').textContent = loadError; });
