import {count, currency, english, locale, loadError, node, readJSON} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const t = (en, pt) => english ? en : pt;
const money = cents => cents == null ? '–' : currency.format(cents / 100);
const signed = new Intl.NumberFormat(locale, {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const statusLabels = {
  amount: t('Amount changed', 'Valor alterado'),
  label: t('Label only', 'Somente descrição'),
  added: t('Added', 'Incluída'),
  removed: t('Removed', 'Removida'),
  unchanged: t('Unchanged', 'Sem alteração'),
};
const company = $('cvm-company');
const pair = $('cvm-pair');
const filter = $('cvm-filter');
const search = $('cvm-search');
const more = $('show-more-lines');
const status = $('filing-status');
const pageSize = 12;
let limit = pageSize;

function option(value, label) {
  const element = node('option', label);
  element.value = value;
  return element;
}

function filingName(filing) {
  return 'DFP ' + filing.filing_date.slice(0, 4) + ' · ' + 'v' + filing.version;
}

function sourceCard(filing, source, label) {
  const card = node('article');
  card.append(node('p', label), node('h3', filingName(filing)),
    node('p', t('Received ', 'Recebido em ') + filing.received_on + ' · ' + t('Document ', 'Documento ') + filing.document_id));
  const link = node('a', t('Open source archive', 'Abrir arquivo de origem'));
  link.href = source.url;
  const provenance = node('small', t('Captured ', 'Capturado em ') + source.captured_on.slice(0, 10) + ' · SHA-256 ' + source.id);
  provenance.className = 'case-note';
  card.append(link, provenance);
  return card;
}

function showLine(change, comparison, sources) {
  const detail = $('filing-account');
  const title = $('account-detail-title');
  title.textContent = change.account + ' · ' + (change.after ?? change.before).label;
  const sides = [
    [t('Earlier disclosure', 'Divulgação anterior'), change.before, comparison.before],
    [t('Later disclosure', 'Divulgação posterior'), change.after, comparison.after],
  ];
  $('account-detail-values').replaceChildren(...sides.map(([heading, row, filing]) => {
    const card = node('article');
    card.append(node('h4', heading), node('strong', row ? money(row.cents) : t('Account absent', 'Conta ausente')));
    if (row) {
      const source = sources[filing.source_id];
      const reference = node('small',
        row.label + ' · ' + source.statements_member + ' · ' + t('line ', 'linha ') + row.source_line);
      const original = node('small',
        t('Original value ', 'Valor original ') + row.source_amount + ' · ' + t('source scale ', 'escala ') + row.source_scale);
      card.append(reference, original);
    }
    return card;
  }));
  $('account-delta').textContent = change.delta_cents == null
    ? statusLabels[change.status]
    : statusLabels[change.status] + ' · ' + signed.format(change.delta_cents / 100);
  detail.hidden = false;
  for (const button of $('filing-lines').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.account === change.account));
  }
  title.focus();
}

readJSON('evidence/cvm-filing-diffs.json').then(({sources, cases}) => {
  for (const item of cases) company.append(option(item.issuer, item.company));
  for (const control of [company, pair, filter, search]) control.disabled = false;
  let current;

  function renderLines() {
    const term = search.value.trim().toLocaleLowerCase(locale);
    const rows = current.changes.filter(line => {
      const byStatus = filter.value === 'all' || filter.value === line.status ||
        filter.value === 'changed' && line.status !== 'unchanged' ||
        filter.value === 'structure' && ['added', 'removed'].includes(line.status);
      const searchable = [line.account, line.before?.label, line.after?.label].join(' ').toLocaleLowerCase(locale);
      return byStatus && searchable.includes(term);
    });
    $('filing-account').hidden = true;
    $('filing-lines').replaceChildren(...rows.slice(0, limit).map(change => {
      const tr = node('tr');
      const heading = node('th');
      heading.scope = 'row';
      const button = node('button', change.account + ' · ' + (change.after ?? change.before).label);
      button.type = 'button';
      button.dataset.account = change.account;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => showLine(change, current, sources));
      heading.append(button);
      const before = node('td', money(change.before?.cents));
      const after = node('td', money(change.after?.cents));
      before.className = after.className = 'desktop-amount finance-number';
      const delta = node('td', change.delta_cents == null ? '–' : signed.format(change.delta_cents / 100));
      delta.append(node('small', statusLabels[change.status]));
      tr.append(heading, before, after, delta);
      return tr;
    }));
    const displayed = count.format(Math.min(limit, rows.length));
    status.textContent = rows.length
      ? t(`${displayed} of ${count.format(rows.length)} lines`, `${displayed} de ${count.format(rows.length)} contas`)
      : t('No lines match. Choose All lines to see the comparison.', 'Nenhuma conta corresponde. Escolha Todas as contas para ver a comparação.');
    more.hidden = rows.length <= limit;
  }

  function renderComparison() {
    const item = cases.find(row => row.issuer === company.value);
    current = item.comparisons[Number(pair.value)];
    const {before, after, counts} = current;
    $('comparison-type').textContent = before.filing_date === after.filing_date
      ? t('Same filing reference date. Compare the two captured disclosures.', 'Mesma data de referência. Compare as duas divulgações capturadas.')
      : t('Fiscal 2024 as reported in its own DFP, compared with the fiscal 2024 comparative column in the following DFP.',
        'Exercício de 2024 em sua DFP, comparado à coluna de 2024 divulgada na DFP do ano seguinte.');
    $('filing-sources').replaceChildren(
      sourceCard(before, sources[before.source_id], t('Earlier disclosure', 'Divulgação anterior')),
      sourceCard(after, sources[after.source_id], t('Later disclosure', 'Divulgação posterior')),
    );
    $('count-amount').textContent = count.format(counts.amount ?? 0);
    $('count-structure').textContent = count.format((counts.added ?? 0) + (counts.removed ?? 0));
    $('count-label').textContent = count.format(counts.label ?? 0);
    $('count-unchanged').textContent = count.format(counts.unchanged ?? 0);
    $('filing-history').replaceChildren(...item.timeline.map(filing => node('li',
      filingName(filing) + ' · ' + t('Received ', 'Recebido em ') + filing.received_on + ' · ' + t('Document ', 'Documento ') + filing.document_id)));
    refreshLines();
  }

  function refreshLines() {
    limit = pageSize;
    renderLines();
  }

  function renderCompany() {
    const item = cases.find(row => row.issuer === company.value);
    pair.replaceChildren(...item.comparisons.map(({before, after}, index) => option(
      index, filingName(before) + ' → ' + filingName(after),
    )));
    $('pair-control').hidden = item.comparisons.length < 2;
    filter.value = 'changed';
    search.value = '';
    renderComparison();
  }
  company.addEventListener('change', renderCompany);
  pair.addEventListener('change', renderComparison);
  filter.addEventListener('change', refreshLines);
  search.addEventListener('input', refreshLines);
  more.addEventListener('click', () => {
    limit += pageSize;
    renderLines();
    if (more.hidden) status.focus();
  });
  renderCompany();
}).catch(() => { status.textContent = loadError; });
