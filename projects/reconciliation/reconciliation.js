import {count, english, locale, loadError, node, readJSON} from '../../assets/case-data.js';

const $ = id => document.getElementById(id);
const t = (en, pt) => english ? en : pt;
const base = {style: 'currency', currency: 'BRL'};
const brl = new Intl.NumberFormat(locale, base);
const signed = new Intl.NumberFormat(locale, {...base, signDisplay: 'exceptZero'});
const money = cents => brl.format(cents / 100);
const delta = cents => signed.format(cents / 100);
const labels = {
  matched: t('Matched', 'Conciliado'),
  amount_mismatch: t('Amount mismatch', 'Valor divergente'),
  missing_payout: t('Missing payout', 'Repasse ausente'),
  unmatched_bank: t('Unmatched bank entry', 'Lançamento bancário sem vínculo'),
  unmatched_sale: t('Settlement without an ERP sale', 'Liquidação sem venda no ERP'),
  scheduled: t('Scheduled', 'Agendado'),
};
const descriptions = {
  matched: t('The bank entries add up to the expected net payout.', 'Os lançamentos bancários somam o líquido esperado.'),
  amount_mismatch: t('The bank total differs from the settlement after fees and chargebacks.', 'O total no banco diverge da liquidação após taxas e chargebacks.'),
  missing_payout: t('The settlement was due by the cutoff. No bank posting carries this payout ID.', 'A liquidação venceu até a data de corte. Nenhum lançamento no banco traz este ID de repasse.'),
  unmatched_bank: t('The bank posted this reference, but the acquirer extract has no corresponding payout.', 'O banco registrou esta referência, mas o extrato da adquirente não contém o repasse correspondente.'),
  unmatched_sale: t('At least one settlement movement has no ERP sale with the same ID.', 'Pelo menos um movimento de liquidação não possui uma venda com o mesmo ID no ERP.'),
  scheduled: t('The expected payout date is after the cutoff.', 'A data de repasse prevista é posterior à data de corte.'),
};

function facts(values) {
  const list = node('dl');
  list.className = 'record-fields';
  for (const [label, value] of values) {
    const pair = node('div');
    pair.append(node('dt', label), node('dd', value));
    list.append(pair);
  }
  return list;
}

function showPayout(payout, focus = false) {
  $('payout-detail').hidden = false;
  const title = $('payout-title');
  title.textContent = payout.payout_id + ' · ' + labels[payout.status];
  $('payout-explanation').textContent = descriptions[payout.status];
  $('payout-expected').textContent = money(payout.expected_cents);
  $('payout-bank').textContent = money(payout.bank_cents);
  $('payout-difference').textContent = delta(payout.difference_cents);
  $('settlement-empty').hidden = payout.settlements.length > 0;
  $('settlement-trace').replaceChildren(...payout.settlements.map((entry, index) => {
    const item = node('li');
    const detail = node('details');
    detail.open = index === 0;
    const label = entry.kind === 'chargeback'
      ? 'Chargeback'
      : t(`Installment ${entry.installment}`, `Parcela ${entry.installment}`);
    const summary = node('summary');
    summary.append(node('strong', entry.movement_id + ' · ' + label),
      node('small', ' · ' + money(entry.net_cents)));
    const sale = entry.sale;
    const source = sale
      ? t(`ERP ${sale.sale_id} · ${sale.sold_on} · Original sale ${money(sale.amount_cents)} · ${sale.installments} installment(s)`,
        `ERP ${sale.sale_id} · ${sale.sold_on} · Venda original ${money(sale.amount_cents)} · ${sale.installments} parcela(s)`)
      : t(`ERP reference ${entry.sale_id} has no matching sale.`, `Referência ${entry.sale_id} sem venda correspondente no ERP.`);
    detail.append(summary, node('p', source), facts([
      [t('Gross movement', 'Movimento bruto'), money(entry.gross_cents)],
      [t('Fees', 'Taxas'), money(entry.fee_cents)],
      [t('Net movement', 'Movimento líquido'), money(entry.net_cents)],
      [t('Due date', 'Vencimento'), entry.due_on],
    ]));
    item.append(detail);
    return item;
  }));
  $('bank-empty').hidden = payout.bank_entries.length > 0;
  $('bank-trace').replaceChildren(...payout.bank_entries.map(entry => {
    const item = node('li');
    item.append(node('strong', entry.bank_id), ' · ' + entry.posted_on + ' · ' + money(entry.amount_cents));
    return item;
  }));
  for (const item of $('payout-list').querySelectorAll('button')) {
    item.setAttribute('aria-pressed', String(item.dataset.payout === payout.payout_id));
  }
  if (focus && matchMedia('(max-width: 860px)').matches) title.focus();
}

readJSON('evidence/payments.json').then(({summary, payouts}) => {
  $('recon-expected').textContent = money(summary.expected_cents);
  $('recon-bank').textContent = money(summary.bank_cents);
  $('recon-exceptions').textContent = count.format(summary.exceptions);
  $('recon-exposure').textContent = money(summary.absolute_gap_cents);

  const filter = $('payout-filter');
  const queue = $('payout-list');
  function renderQueue() {
    const list = payouts.filter(payout => {
      if (filter.value === 'all') return true;
      if (filter.value === 'matched') return payout.status === 'matched';
      return !['matched', 'scheduled'].includes(payout.status);
    });
    queue.replaceChildren(...list.map(payout => {
      const item = node('li');
      const button = node('button');
      button.type = 'button';
      button.dataset.payout = payout.payout_id;
      const gap = node('span', delta(payout.difference_cents));
      gap.className = 'finance-number';
      button.append(node('strong', payout.payout_id), gap, node('small', labels[payout.status]));
      button.addEventListener('click', () => showPayout(payout, true));
      item.append(button);
      return item;
    }));
    $('recon-status').textContent = t(
      `${count.format(list.length)} of ${count.format(payouts.length)} payouts`,
      `${count.format(list.length)} de ${count.format(payouts.length)} repasses`,
    );
    if (list.length) showPayout(list[0]);
    else $('payout-detail').hidden = true;
  }
  filter.disabled = false;
  filter.addEventListener('change', renderQueue);
  renderQueue();
}).catch(() => { $('recon-status').textContent = loadError; });
