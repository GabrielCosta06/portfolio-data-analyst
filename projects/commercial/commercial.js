import {$,tr,label,language,money,number,pct,monthName,aggregate,groupBy,fillTable,checks,loadCommercial,fetchJSON,revenueChart,showError,downloadCSV} from '../../assets/site.js';
let data, evidence, quarantine=[], selected=[], fault='clean';
const filterIds=['month','category','region','channel'];
function changeTab(){
  const hash=location.hash.slice(1);
  const active=hash==='walkthrough'?'engineering':['analysis','quality','engineering'].includes(hash)?hash:'analysis';
  document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===active)));
  for(const key of ['analysis','quality','engineering']) $(key).hidden=!data||key!==active;
  if(data&&hash==='walkthrough')requestAnimationFrame(()=>$('walkthrough').scrollIntoView());
}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{history.replaceState(null,'',`${location.pathname}${location.search}#${button.dataset.tab}`);changeTab();}));
window.addEventListener('hashchange',changeTab);
for(const id of filterIds) $(id).addEventListener('change',()=>{const url=new URL(location.href);for(const key of filterIds){if($(key).value)url.searchParams.set(key,$(key).value);else url.searchParams.delete(key);}history.replaceState(null,'',url);renderAnalysis();});
$('reset').addEventListener('click',()=>{const url=new URL(location.href);for(const id of filterIds){$(id).value='';url.searchParams.delete(id);}history.replaceState(null,'',url);$('discount').value=0;$('cost').value=0;renderAnalysis();});
$('export').addEventListener('click',()=>downloadCSV(selected,'commercial-selection-synthetic.csv'));
$('discount').addEventListener('input',renderScenario);$('cost').addEventListener('input',renderScenario);
document.querySelectorAll('[data-fault]').forEach(button=>button.addEventListener('click',()=>{fault=button.dataset.fault;renderLab();}));

function filters(){
  const params=new URL(location.href).searchParams;
  for(const id of filterIds){
    const current=$(id).value||params.get(id)||'';
    while($(id).options.length>1)$(id).remove(1);
    for(const value of [...new Set(data.rows.map(r=>id==='month'?r.date.slice(0,7):r[id]))].sort()){
      const option=document.createElement('option');option.value=value;option.textContent=id==='month'?`${monthName(value)} 2026`:label(value);$(id).append(option);
    }
    $(id).value=[...$(id).options].some(o=>o.value===current)?current:'';
  }
}
function finding(index,title,body){
  const node=document.createElement('div');node.className='finding';const small=document.createElement('span');small.className='mono';small.textContent=index;const heading=document.createElement('h3');heading.textContent=title;const paragraph=document.createElement('p');paragraph.textContent=body;node.append(small,heading,paragraph);return node;
}
function renderAnalysis(){
  if(!data)return;
  selected=data.rows.filter(row=>filterIds.every(id=>!$(id).value||(id==='month'?row.date.slice(0,7):row[id])===$(id).value));
  const total=aggregate(selected);const orders=new Set(selected.map(r=>r.order_id)).size;
  $('filter-status').textContent=tr(`${number(selected.length)} de ${number(data.rows.length)} itens · ${number(orders)} pedidos · BRL · dados sintéticos`,`${number(selected.length)} of ${number(data.rows.length)} items · ${number(orders)} orders · BRL · synthetic data`);
  $('revenue').textContent=money(total.revenue_cents);$('profit').textContent=money(total.profit_cents);$('margin').textContent=pct(total.revenue_cents?total.profit_cents/total.revenue_cents:NaN);$('orders').textContent=number(orders);$('export').disabled=!selected.length;
  const months=$('month').value?[$('month').value]:[...new Set(data.rows.map(r=>r.date.slice(0,7)))].sort();
  const monthly=revenueChart($('monthly-chart'),selected,months);
  fillTable('monthly-table',monthly.map(r=>[`${monthName(r.month)} 2026`,money(r.revenue_cents),pct(r.revenue_cents?r.profit_cents/r.revenue_cents:NaN)]));
  const categories=groupBy(selected,'category').sort((a,b)=>b.revenue_cents-a.revenue_cents);
  fillTable('category-table',categories.map(r=>[label(r.name),money(r.revenue_cents),money(r.profit_cents),pct(r.revenue_cents?r.profit_cents/r.revenue_cents:NaN)]));
  const customers=groupBy(selected,'customer_id').sort((a,b)=>b.revenue_cents-a.revenue_cents).slice(0,8);
  fillTable('customer-table',customers.map(r=>[r.items[0].customer.replace('Cliente',tr('Cliente','Customer')),r.items[0].segment,money(r.revenue_cents),money(r.profit_cents),pct(r.revenue_cents?r.profit_cents/r.revenue_cents:NaN),pct(total.revenue_cents?r.revenue_cents/total.revenue_cents:NaN)]));
  const findings=$('findings');findings.replaceChildren();
  if(categories.length){
    const topRevenue=categories[0];const topProfit=[...categories].sort((a,b)=>b.profit_cents-a.profit_cents)[0];
    findings.append(finding('01 / CONTRIBUTION',tr('Quem vende mais? Quem contribui mais?','Who sells more? Who contributes more?'),tr(`${label(topRevenue.name)} lidera receita; ${label(topProfit.name)} lidera lucro bruto. Compare contribuição, não só faturamento.`,`${label(topRevenue.name)} leads revenue; ${label(topProfit.name)} leads gross profit. Compare contribution alongside sales.`)));
    const nonzero=monthly.filter(r=>r.revenue_cents>0);const first=nonzero[0],last=nonzero.at(-1);
    if(nonzero.length>1){const rev=last.revenue_cents/first.revenue_cents-1;const margin=(last.profit_cents/last.revenue_cents-first.profit_cents/first.revenue_cents)*100;
      findings.append(finding('02 / TREND',`${monthName(first.month)} → ${monthName(last.month)}`,tr(`Receita ${pct(rev)}; margem ${number(margin)} p.p. O movimento combina mix, desconto e custo; não isola causa.`,`Revenue ${pct(rev)}; margin ${number(margin)} pp. This combines mix, discounts and costs; it does not isolate a cause.`)));
    }else findings.append(finding('02 / SCOPE',tr('Uma fotografia do período','A period snapshot'),tr('Selecione todos os meses para comparar o início e o fim da série.','Select all months to compare the beginning and end of the series.')));
    findings.append(finding('03 / DISCOUNTS',tr('Quanto fica pelo caminho?','How much is given back?'),tr(`${money(total.discount_cents)} em descontos e ${money(total.refund_cents)} em devoluções neste recorte.`,`${money(total.discount_cents)} in discounts and ${money(total.refund_cents)} in returns in this slice.`)));
  }else findings.append(finding('NO DATA',tr('Nenhum resultado','No results'),tr('Limpe os filtros para explorar a base completa.','Reset filters to explore the full dataset.')));
  const parts=[[tr('Venda bruta','Gross sales'),total.gross_cents,false],[tr('Descontos','Discounts'),total.discount_cents,true],[tr('Devoluções','Returns'),total.refund_cents,true],[tr('Receita líquida','Net revenue'),total.revenue_cents,false]];
  $('revenue-bridge').replaceChildren(...parts.map(([name,value,loss])=>{const row=document.createElement('div');row.className='bridge-row'+(loss?' loss':'');const text=document.createElement('span');text.textContent=name;const track=document.createElement('div');track.className='bridge-track';const bar=document.createElement('div');bar.className='bridge-bar';bar.style.width=`${total.gross_cents?value/total.gross_cents*100:0}%`;track.append(bar);const amount=document.createElement('span');amount.textContent=(loss?'− ':'')+money(value);row.append(text,track,amount);return row;}));
  renderScenario();
}
function renderScenario(){
  const total=aggregate(selected);const discount=Number($('discount').value)/100,cost=Number($('cost').value)/100;
  const revenue=Math.round(total.revenue_cents*(1-discount)),costs=Math.round(total.cost_cents*(1+cost));const profit=revenue-costs;
  $('discount-value').textContent=pct(discount);$('cost-value').textContent=(cost>0?'+':'')+pct(cost);
  $('scenario-margin').textContent=pct(revenue?profit/revenue:NaN);$('scenario-delta').textContent=money(profit-total.profit_cents);
}
function renderLab(){
  if(!data)return;
  const sample=data.rows.slice(0,3).map(row=>({...row}));
  if(fault==='duplicate')sample.push({...sample[0]});
  if(fault==='cost'){sample[0].unit_cost_cents=-100000;const units=sample[0].quantity-sample[0].returned_qty;sample[0].cost_cents=units*sample[0].unit_cost_cents;sample[0].profit_cents=sample[0].revenue_cents-sample[0].cost_cents;}
  if(fault==='customer')sample[0].customer_id='UNKNOWN';
  const known=new Set(data.rows.map(r=>r.customer_id)), seen=new Set(), accepted=[], reasons=[];
  for(const row of sample){const errors=[];if(seen.has(row.item_id))errors.push('duplicate_item_version');if(row.unit_cost_cents<0)errors.push('invalid_unit_cost_cents');if(!known.has(row.customer_id))errors.push('unknown_customer');if(errors.length)reasons.push(`${row.item_id} → ${errors.join(', ')}`);else{accepted.push(row);seen.add(row.item_id);}}
  $('unchecked-profit').textContent=money(aggregate(sample).profit_cents);$('validated-profit').textContent=money(aggregate(accepted).profit_cents);
  $('lab-message').textContent=tr(`${sample.length} itens recebidos · ${accepted.length} aceitos · ${sample.length-accepted.length} isolados`,`${sample.length} items received · ${accepted.length} accepted · ${sample.length-accepted.length} quarantined`);
  $('lab-reason').textContent=reasons.length?reasons.join('\n'):tr('Contrato válido. Nenhuma linha isolada.','Contract valid. No rows quarantined.');
  document.querySelectorAll('[data-fault]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.fault===fault)));
}
function renderEvidence(){
  if(!data||!evidence)return;
  const m=data.manifest;
  checks('quality-counts',[[tr('Eventos únicos recebidos','Unique events received'),number(m.events_seen)],[tr('Itens ativos publicados','Active published items'),number(m.items)],[tr('Eventos em quarentena','Quarantined events'),number(m.quarantined)],[tr('Eventos antigos ignorados','Stale events ignored'),number(m.stale_events_ignored)]]);
  fillTable('rule-table',Object.entries(m.rules).map(([rule,count])=>[rule,number(count)]));
  fillTable('quarantine-table',quarantine.map(row=>[row.event.event_id,row.event.item_id,row.reasons.join(', ')]));
  fillTable('run-table',data.pointer.history.map((run,i)=>[tr(i?'02 · Corrigido':'01 · Base inicial',i?'02 · Corrected':'01 · Baseline'),number(run.items),money(run.revenue_cents)]));
  checks('run-checks',[[tr('Replay: mesmo snapshot','Replay: same snapshot'),evidence.replay_same_snapshot?tr('Verificado','Verified'):tr('Falhou','Failed')],[tr('Itens excluídos logicamente','Tombstoned items'),number(m.deleted_items)],[tr('Evento antigo ignorado','Stale event ignored'),number(m.stale_events_ignored)],[tr('Variação após correções','Change after corrections'),money(evidence.changed_revenue_cents)]]);
  const names={sql_export_reconciled:tr('SQL ↔ JSON / CSV','SQL ↔ JSON / CSV'),financial_identity:tr('Conciliação financeira','Financial reconciliation'),foreign_keys:tr('Referências de dimensões','Dimension references'),unique_items:tr('Unicidade de itens','Unique items')};
  checks('snapshot-checks',[...Object.entries(m.checks).map(([key,value])=>[names[key],value?tr('Passou','Passed'):tr('Falhou','Failed')]),[tr('SHA-256 no navegador','Browser SHA-256'),data.hashVerified?tr('Conferido','Verified'):tr('Indisponível neste contexto','Unavailable in this context')]]);
  $('snapshot-id').textContent=m.run_id;$('manifest-link').href=data.path+'manifest.json';$('quarantine-download').href=data.path+'quarantine.json';$('full-download').href=data.path+'sales.csv';
}
function render(){if(data){filters();renderAnalysis();renderEvidence();renderLab();}}
document.addEventListener('languagechange',render);
async function init(){
  try{const loaded=await loadCommercial('../../');const extras=await Promise.all([fetchJSON('../../data/commercial/demo-evidence.json'),fetchJSON(loaded.path+'quarantine.json')]);data=loaded;[evidence,quarantine]=extras;$('app-status').hidden=true;render();changeTab();}
  catch{showError('app-status');}
}
init();

let resizeTimer; addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderAnalysis,120);});
