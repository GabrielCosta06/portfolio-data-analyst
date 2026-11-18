import {count, currency, english, loadError, node, readJSON} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const t = (en, pt) => english ? en : pt;
const money = cents => cents === null ? '–' : currency.format(cents / 100);
const plural = (value, one, many) => count.format(value) + ' ' + (value === 1 ? one : many);
const sequence = ['baseline', 'incremental', 'replay'];
const headings = [
  t('Initial batch loaded', 'Carga inicial concluída'),
  t('Changes applied', 'Alterações aplicadas'),
  t('Batch replayed', 'Lote reprocessado'),
];
const actions = [
  t('Load initial batch', 'Carregar lote inicial'),
  t('Apply change batch', 'Aplicar lote de alterações'),
  t('Replay the same batch', 'Reprocessar o mesmo lote'),
];
const outcomes = {
  inserted: t('Inserted', 'Inserido'),
  updated: t('Updated', 'Atualizado'),
  quarantined: t('Quarantined', 'Em quarentena'),
  unchanged: t('Unchanged', 'Sem alteração'),
};
const next = $('incremental-next');
const reset = $('incremental-reset');
const status = $('incremental-status');
let phase = 0;

function renderEvents(events, replay) {
  $('incremental-events').hidden = false;
  $('incremental-rows').replaceChildren(...events.map(event => {
    const row = node('tr');
    const header = node('th', event.order_id);
    header.scope = 'row';
    const detail = node('small', event.order_date + ' · v' + event.revision);
    detail.className = 'row-detail';
    header.append(detail);

    let result = outcomes[event.action];
    if (event.reason === 'invalid_date') {
      result = replay ? t('Already quarantined', 'Já em quarentena') : t('Quarantined · invalid date', 'Quarentena · data inválida');
    } else if (replay) {
      result = outcomes.unchanged;
    }
    row.append(header, node('td', result), node('td', money(replay ? event.after_cents : event.before_cents)),
      node('td', money(event.after_cents)));
    return row;
  }));
}

readJSON('evidence/incremental-delta.json').then(({steps, events}) => {
  next.disabled = false;
  status.textContent = t('Ready to load the initial batch.', 'Pronto para carregar o lote inicial.');
  next.addEventListener('click', () => {
    const step = steps[sequence[phase]];
    const replay = phase === 2;
    $('incremental-result').hidden = false;
    $('incremental-phase').textContent = headings[phase];
    $('incremental-orders').textContent = count.format(step.orders);
    $('incremental-revenue').textContent = money(step.revenue_cents);
    $('incremental-profit').textContent = money(step.profit_cents);
    $('incremental-quarantine').textContent = count.format(step.stored_rejections);
    $('incremental-hash').textContent = step.sha256;
    const counts = t(
      `${count.format(step.inserted)} inserted, ${step.updated} updated, ${step.quarantined} newly quarantined.`,
      `${plural(step.inserted, 'inserção', 'inserções')}, ${plural(step.updated, 'atualização', 'atualizações')}, ${plural(step.quarantined, 'novo registro em quarentena', 'novos registros em quarentena')}.`,
    );
    const proof = replay && step.sha256 === steps.incremental.sha256
      ? t(' The SHA-256 fingerprint matches the previous step. Both tables are unchanged.', ' A assinatura SHA-256 coincide com a da etapa anterior. Ambas as tabelas permanecem iguais.')
      : '';
    status.textContent = counts + proof;
    if (phase > 0) renderEvents(events, replay);
    phase += 1;
    next.disabled = phase === sequence.length;
    if (!next.disabled) next.textContent = actions[phase];
    reset.disabled = false;
    if (replay) reset.focus({preventScroll: true});
  });
  reset.addEventListener('click', () => {
    phase = 0;
    $('incremental-result').hidden = true;
    $('incremental-events').hidden = true;
    status.textContent = t('Ready to load the initial batch.', 'Pronto para carregar o lote inicial.');
    next.textContent = actions[0];
    next.disabled = false;
    reset.disabled = true;
    next.focus({preventScroll: true});
  });
}).catch(() => { status.textContent = loadError; });
