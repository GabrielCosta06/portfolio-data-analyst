export let language = 'pt';
export const tr = (pt, en) => language === 'en' ? en : pt;
export const locale = () => language === 'en' ? 'en-US' : 'pt-BR';
export const money = (cents, compact = false) => new Intl.NumberFormat(locale(), {style:'currency', currency:'BRL', maximumFractionDigits: compact ? 1 : 0, ...(compact ? {notation:'compact'} : {})}).format(cents / 100);
export const number = n => new Intl.NumberFormat(locale(), {maximumFractionDigits:1}).format(n);
export const pct = n => Number.isFinite(n) ? new Intl.NumberFormat(locale(), {style:'percent',maximumFractionDigits:1}).format(n) : '—';
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const $ = id => document.getElementById(id);
export const label = value => ({'Equipamentos':['Equipamentos','Equipment'],'Consumíveis':['Consumíveis','Consumables'],'Serviços':['Serviços','Services'],'Sudeste':['Sudeste','Southeast'],'Sul':['Sul','South'],'Nordeste':['Nordeste','Northeast'],'Centro-Oeste':['Centro-Oeste','Central-West'],'Direto':['Direto','Direct'],'Distribuidor':['Distribuidor','Distributor']})[value]?.[language === 'en' ? 1 : 0] ?? value;
export const monthName = value => new Intl.DateTimeFormat(locale(), {month:'short', timeZone:'UTC'}).format(new Date(`${value}-02T00:00:00Z`)).replace('.','');

export function setLanguage(next, notify = true) {
  language = next === 'en' ? 'en' : 'pt';
  document.documentElement.lang = language === 'en' ? 'en' : 'pt-BR';
  try { localStorage.setItem('portfolio-language', language); } catch { /* Private storage may be unavailable. */ }
  const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null,'',url);
  document.querySelectorAll('[data-pt][data-en]').forEach(node => {node.textContent = node.dataset[language];});
  document.querySelectorAll('[data-lang]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.lang === language)));
  for (const video of document.querySelectorAll('video')) {
    for (const track of video.textTracks) track.mode = track.language === language ? 'showing' : 'disabled';
  }
  if (notify) document.dispatchEvent(new CustomEvent('languagechange'));
}
let initial;
try { initial = localStorage.getItem('portfolio-language'); } catch { /* Use page default. */ }
setLanguage(new URL(location.href).searchParams.get('lang') || initial || 'pt', false);
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

export async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
export async function loadCommercial(base) {
  const pointer = await fetchJSON(`${base}data/commercial/current.json`);
  if (!/^[a-f0-9]{16}$/.test(pointer.run_id) || pointer.path !== `runs/${pointer.run_id}`) throw new Error('Invalid snapshot pointer');
  const path = `${base}data/commercial/${pointer.path}/`;
  const [manifest, response] = await Promise.all([fetchJSON(path+'manifest.json'),fetch(path+'sales.json')]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  let hashVerified = false;
  if (globalThis.crypto?.subtle) {
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (hash !== manifest.files['sales.json']) throw new Error('Snapshot checksum mismatch');
    hashVerified = true;
  }
  const rows = JSON.parse(new TextDecoder().decode(bytes));
  const total = aggregate(rows);
  if (manifest.run_id !== pointer.run_id || rows.length !== manifest.items || total.revenue_cents !== manifest.totals.revenue_cents || total.profit_cents !== manifest.totals.profit_cents || new Set(rows.map(r=>r.item_id)).size !== rows.length) throw new Error('Snapshot reconciliation failed');
  return {pointer,manifest,rows,path,hashVerified};
}
export const aggregate = rows => rows.reduce((total,row) => {
  for (const key of ['gross_cents','discount_cents','refund_cents','revenue_cents','cost_cents','profit_cents']) total[key] += row[key];
  return total;
}, {gross_cents:0,discount_cents:0,refund_cents:0,revenue_cents:0,cost_cents:0,profit_cents:0});
export function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {const value = typeof key === 'function' ? key(row) : row[key]; if (!groups.has(value)) groups.set(value,[]);groups.get(value).push(row);}
  return [...groups].map(([name,items])=>({name,items,...aggregate(items)}));
}
export function fillTable(id, rows) {
  const body = $(id); body.replaceChildren();
  for (const values of rows) {
    const row = document.createElement('tr');
    values.forEach((value,index)=>{const cell=document.createElement('td');cell.textContent=value;if(index && typeof value === 'string' && /[0-9—]/.test(value))cell.className='numeric';row.append(cell);});
    body.append(row);
  }
  if (!rows.length) {const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=8;cell.className='empty';cell.textContent=tr('Nenhum dado para esta combinação.','No data for this combination.');row.append(cell);body.append(row);}
}
export function checks(id, entries) {
  $(id).replaceChildren(...entries.map(([name,value])=>{const li=document.createElement('li');const span=document.createElement('span');span.textContent=name;const strong=document.createElement('strong');strong.textContent=value;li.append(span,strong);return li;}));
}
export function showError(id) {
  const element = $(id); element.hidden=false;element.className='error';element.replaceChildren();
  const message=document.createElement('span');message.textContent=tr('Não foi possível carregar ou validar os dados. ','Could not load or validate the data. ');
  const button=document.createElement('button');button.className='small-button';button.textContent=tr('Tentar novamente','Try again');button.addEventListener('click',()=>location.reload());element.append(message,button);
}
export function downloadCSV(rows, name) {
  if (!rows.length) return;
  const keys=Object.keys(rows[0]);
  const quote=value => '"'+(typeof value==='string'?value.replace(/^[=+@\-\t\r]/,"'$&"):String(value ?? '')).replaceAll('"','""')+'"';
  const csv='\ufeff'+[keys.map(quote).join(','),...rows.map(row=>keys.map(k=>quote(row[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function revenueChart(container, rows, months) {
  const values = months.map(month=>({month,...aggregate(rows.filter(r=>r.date.startsWith(month)))}));
  const small=innerWidth<=480;
  const w=small?360:620,h=small?250:280,left=small?43:55,right=small?37:45,top=22,bottom=43,plotW=w-left-right,plotH=h-top-bottom;
  const rawMax=Math.max(1,...values.map(r=>r.revenue_cents/100));
  const step=10**Math.floor(Math.log10(rawMax));const max=Math.ceil(rawMax/step)*step;
  const margins=values.map(v=>v.revenue_cents?v.profit_cents/v.revenue_cents:null);
  const marginMin=Math.min(0,...margins.filter(v=>v!==null));const marginMax=Math.max(.6,...margins.filter(v=>v!==null));
  const x=i=>left+plotW/Math.max(1,months.length)*(i+.5);
  const y=v=>top+plotH-(v/max*plotH);
  const ym=v=>top+plotH-(v-marginMin)/(marginMax-marginMin)*plotH;
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="img"><title>${esc(tr('Receita líquida e margem bruta por mês','Net revenue and gross margin by month'))}</title>`;
  for(let i=0;i<=4;i++){const yy=top+plotH-i/4*plotH;svg+=`<line class="grid" x1="${left}" x2="${w-right}" y1="${yy}" y2="${yy}"/><text x="${left-8}" y="${yy+4}" text-anchor="end">${esc(new Intl.NumberFormat(locale(),{notation:'compact',maximumFractionDigits:1}).format(max*i/4))}</text><text x="${w-right+8}" y="${yy+4}">${esc(pct(marginMin+(marginMax-marginMin)*i/4))}</text>`;}
  svg+=`<text x="${left}" y="12">BRL</text>`;
  values.forEach((v,i)=>{const width=Math.min(38,plotW/months.length*.63);svg+=`<rect class="bar" x="${x(i)-width/2}" y="${y(v.revenue_cents/100)}" width="${width}" height="${Math.max(0,top+plotH-y(v.revenue_cents/100))}" rx="2"><title>${esc(monthName(v.month)+': '+money(v.revenue_cents))}</title></rect><text x="${x(i)}" y="${h-18}" text-anchor="middle">${esc(monthName(v.month))}</text>`;});
  // Null margins split the line; missing/zero-revenue months are never connected as zero margin.
  let segment=[];const segments=[];margins.forEach((m,i)=>{if(m===null){if(segment.length)segments.push(segment);segment=[];}else segment.push(`${x(i)},${ym(m)}`);});if(segment.length)segments.push(segment);
  for(const points of segments) svg+=`<polyline class="line" points="${points.join(' ')}"/>`;
  margins.forEach((m,i)=>{if(m!==null)svg+=`<circle class="point" cx="${x(i)}" cy="${ym(m)}" r="3.5"><title>${esc(monthName(months[i])+': '+pct(m))}</title></circle>`;});
  container.innerHTML=svg+'</svg>';
  container.setAttribute('aria-label',tr('Receita líquida em barras e margem bruta em linha. Dados disponíveis na tabela.','Bars show net revenue; line shows gross margin. Values are available in the data table.'));
  return values;
}
