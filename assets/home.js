import { $, tr, money, number, pct, loadCommercial, revenueChart, showError } from './site.js';
let data;
function render(){
  if(!data)return;
  const {manifest,rows}=data;
  const months=[...new Set(rows.map(r=>r.date.slice(0,7)))].sort();
  revenueChart($('hero-chart'),rows,months);revenueChart($('preview-chart'),rows,months);
  $('preview-revenue').textContent=money(manifest.totals.revenue_cents,true);
  $('preview-margin').textContent=pct(manifest.totals.profit_cents/manifest.totals.revenue_cents);
  $('preview-items').textContent=number(manifest.items);
  $('preview-evidence').textContent=tr(`${number(manifest.quarantined)} eventos isolados · SQL reconciliado`,`${number(manifest.quarantined)} events quarantined · SQL reconciled`);
}
document.addEventListener('languagechange',render);
loadCommercial('./').then(result=>{data=result;render();}).catch(()=>{
  $('hero-chart').id='home-error';showError('home-error');$('preview-evidence').textContent=tr('Evidência indisponível','Evidence unavailable');
});

let resizeTimer; addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120);});
