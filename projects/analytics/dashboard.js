const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const percent=new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2});
let source=[],selected=[];
const ids=['category','region','channel','month'];
const fields={category:'Category',region:'Region',channel:'Channel',month:'Date'};
const value=(row,id)=>id==='month'?row.Date.slice(0,7):row[fields[id]];
const cents=(row,key)=>Math.round(Number(row[key])*100);
function aggregate(rows){return rows.reduce((a,r)=>({revenue:a.revenue+cents(r,'Revenue'),profit:a.profit+cents(r,'Profit')}),{revenue:0,profit:0});}
function render(){
 selected=source.filter(r=>ids.every(id=>!document.getElementById(id).value||value(r,id)===document.getElementById(id).value));
 const total=aggregate(selected);
 document.getElementById('revenue').textContent=currency.format(total.revenue/100);
 document.getElementById('profit').textContent=currency.format(total.profit/100);
 document.getElementById('margin').textContent=total.revenue?percent.format(total.profit/total.revenue):'—';
 document.getElementById('orders').textContent=new Set(selected.map(r=>r.OrderId)).size.toLocaleString('pt-BR');
 document.getElementById('results-summary').textContent=`${selected.length} de ${source.length} pedidos válidos no recorte selecionado.`;
 const groups=[...new Set(selected.map(r=>r.Category))].map(name=>({name,...aggregate(selected.filter(r=>r.Category===name))})).sort((a,b)=>b.revenue-a.revenue);
 const tbody=document.getElementById('categories');tbody.replaceChildren();
 for(const group of groups){const tr=document.createElement('tr');for(const text of [group.name,currency.format(group.revenue/100),group.revenue?percent.format(group.profit/group.revenue):'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}tbody.append(tr);}
 const topProfit=[...groups].sort((a,b)=>b.profit-a.profit)[0];
 document.getElementById('insight').textContent=groups.length?`${groups[0].name} lidera a receita neste recorte; ${topProfit.name} tem a maior contribuição em lucro bruto.`:'Nenhum pedido para esta combinação de filtros.';
 const months=[...new Set(source.map(r=>r.Date.slice(0,7)))];
 const totals=months.map(month=>({month,...aggregate(selected.filter(r=>r.Date.startsWith(month)))}));
 const max=Math.max(1,...totals.map(r=>r.revenue));const chart=document.getElementById('monthly-chart');chart.replaceChildren();
 for(const row of totals){const el=document.createElement('div');el.className='bar-row';const label=document.createElement('span');label.textContent=row.month;const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('div');bar.className='bar';bar.style.width=`${row.revenue/max*100}%`;track.append(bar);const amount=document.createElement('span');amount.className='bar-value';amount.textContent=currency.format(row.revenue/100);el.append(label,track,amount);chart.append(el);}
}
document.getElementById('reset').addEventListener('click',()=>{ids.forEach(id=>document.getElementById(id).value='');render();});
document.getElementById('export').addEventListener('click',()=>{if(!selected.length)return;const keys=Object.keys(selected[0]);const quote=v=>'"'+String(v).replaceAll('"','""')+'"';const csv=[keys.map(quote).join(','),...selected.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sales-selection-synthetic.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
fetch('../../data/processed/sales.json').then(r=>{if(!r.ok)throw new Error('Não foi possível carregar os dados.');return r.json();}).then(rows=>{source=rows;for(const id of ids){const el=document.getElementById(id);for(const item of [...new Set(rows.map(r=>value(r,id)))].sort()){const o=document.createElement('option');o.value=item;o.textContent=item;el.append(o);}el.addEventListener('change',render);}render();}).catch(e=>{const status=document.getElementById('results-summary');status.textContent=e.message;status.className='error';});
