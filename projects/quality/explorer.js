import {count, english, loadError, node, percent, readJSON} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const copy = (en, pt) => english ? en : pt;
const labels = {
  duplicate_order_id: copy('Duplicate order ID', 'Identificador de pedido duplicado'),
  missing_order_id: copy('Missing order ID', 'Identificador de pedido vazio'),
  invalid_quantity: copy('Invalid quantity', 'Quantidade inválida'),
  invalid_unit_price: copy('Invalid unit price', 'Preço unitário inválido'),
  invalid_category: copy('Invalid category', 'Categoria inválida'),
  invalid_date: copy('Invalid date', 'Data inválida'),
  invalid_unit_cost: copy('Invalid unit cost', 'Custo unitário inválido'),
  invalid_region: copy('Invalid region', 'Região inválida'),
  invalid_channel: copy('Invalid channel', 'Canal inválido'),
};
const explanations = {
  duplicate_order_id: copy('The first valid occurrence is already in the fact table.', 'A primeira ocorrência válida já está na tabela de pedidos.'),
  missing_order_id: copy('An order needs an identifier to be tracked and deduplicated.', 'O pedido precisa de um identificador para rastreamento e deduplicação.'),
  invalid_quantity: copy('Quantity must be a positive integer.', 'A quantidade precisa ser um número inteiro positivo.'),
  invalid_unit_price: copy('Unit price must be finite and non-negative, with at most two decimal places.', 'O preço unitário precisa ser finito e não negativo, com até duas casas decimais.'),
  invalid_category: copy('Category must be in the allowed list.', 'A categoria precisa estar na lista de valores permitidos.'),
  invalid_date: copy('Order date must be a valid ISO date.', 'A data do pedido precisa ser uma data ISO válida.'),
  invalid_unit_cost: copy('Unit cost must be finite and non-negative, with at most two decimal places.', 'O custo unitário precisa ser finito e não negativo, com até duas casas decimais.'),
  invalid_region: copy('Region must be in the allowed list.', 'A região precisa estar na lista de valores permitidos.'),
  invalid_channel: copy('Channel must be in the allowed list.', 'O canal precisa estar na lista de valores permitidos.'),
};
const fields = {
  source_line: copy('CSV line', 'Linha do CSV'),
  order_date: copy('Order date', 'Data do pedido'),
  category: copy('Category', 'Categoria'),
  region: copy('Region', 'Região'),
  channel: copy('Channel', 'Canal'),
  quantity: copy('Quantity', 'Quantidade'),
  unit_price: copy('Raw unit price', 'Preço unitário bruto'),
  unit_cost: copy('Raw unit cost', 'Custo unitário bruto'),
};
const ruleFilter = $('quality-rule');
const search = $('quality-search');
const selectRecord = $('quality-record');
let rows = [];

function option(value, label) {
  const item = node('option', label);
  item.value = value;
  return item;
}

function showRecord() {
  const row = rows.find(record => String(record.source_line) === selectRecord.value);
  $('quality-details').hidden = !row;
  if (!row) return;
  $('record-title').textContent = row.order_id || copy('Missing order ID', 'Pedido sem identificador');
  $('record-reasons').replaceChildren(...row.reasons.split(';').map(rule => {
    const item = node('li', (labels[rule] ?? rule) + '.');
    if (explanations[rule]) item.append(' ' + explanations[rule]);
    return item;
  }));
  $('record-fields').replaceChildren(...Object.entries(fields).map(([key, label]) => {
    const field = node('div');
    field.append(node('dt', label), node('dd', row[key] === '' ? copy('(empty)', '(vazio)') : row[key]));
    return field;
  }));
}

function filterRecords() {
  const term = search.value.trim().toLowerCase();
  const previous = selectRecord.value;
  const matches = rows.filter(row => {
    const matchesRule = !ruleFilter.value || row.reasons.split(';').includes(ruleFilter.value);
    const matchesQuery = !term || row.order_id.toLowerCase().includes(term) || String(row.source_line).includes(term);
    return matchesRule && matchesQuery;
  });
  selectRecord.replaceChildren(...matches.map(row => option(
    row.source_line, row.source_line + ' · ' + (row.order_id || copy('(empty)', '(vazio)')),
  )));
  if (matches.some(row => String(row.source_line) === previous)) selectRecord.value = previous;
  selectRecord.disabled = !matches.length;
  $('quality-status').textContent = matches.length
    ? copy(`${count.format(matches.length)} of ${count.format(rows.length)} quarantined rows.`, `${count.format(matches.length)} de ${count.format(rows.length)} linhas em quarentena.`)
    : copy('No quarantined records match your search.', 'Nenhum registro em quarentena corresponde à busca.');
  showRecord();
}

Promise.all([readJSON('data/processed/manifest.json'), readJSON('data/processed/quarantine.json')])
  .then(([manifest, quarantine]) => {
    if (quarantine.length !== manifest.quarantined_rows) throw new Error('Quarantine count differs from manifest');
    rows = quarantine;
    $('quality-input').textContent = count.format(manifest.input_rows);
    $('quality-accepted').textContent = count.format(manifest.accepted_rows);
    $('quality-rejected').textContent = count.format(manifest.quarantined_rows);
    $('quality-rate').textContent = manifest.input_rows ? percent.format(manifest.accepted_rows / manifest.input_rows) : '–';
    for (const [rule, hits] of Object.entries(manifest.rule_failures)) {
      const label = labels[rule] ?? rule;
      ruleFilter.append(option(rule, label));
      const tr = node('tr');
      const header = node('th', label);
      header.scope = 'row';
      tr.append(header, node('td', count.format(hits)));
      $('quality-rules').append(tr);
    }
    ruleFilter.disabled = false;
    search.disabled = false;
    ruleFilter.addEventListener('change', filterRecords);
    search.addEventListener('input', filterRecords);
    selectRecord.addEventListener('change', showRecord);
    filterRecords();
  })
  .catch(() => { $('quality-status').textContent = loadError; });
