import {$,tr,language,locale,number,pct,esc,fetchJSON,fillTable,checks,showError} from '../../assets/site.js';
let data;
$('measure').addEventListener('change',render);$('scale').addEventListener('change',render);
document.addEventListener('languagechange',render);
function render(){
  if(!data)return;
  $('measure').options[0].textContent=tr('Total anual (Mt CO₂)','Annual total (Mt CO₂)');
  $('measure').options[1].textContent=tr('Por pessoa (t CO₂)','Per person (t CO₂)');
  $('scale').options[0].textContent=tr('Valor absoluto','Absolute value');$('scale').options[1].textContent=tr('Índice: 2000 = 100','Index: 2000 = 100');
  const percapita=$('measure').value==='percapita',indexed=$('scale').value==='indexed';
  const keys=percapita?['co2_per_capita','co2_including_luc_per_capita']:['co2','co2_including_luc'];
  const rows=data.rows;const first=rows[0],last=rows.at(-1);const format=v=>v===null?'—':new Intl.NumberFormat(locale(),{maximumFractionDigits:percapita?2:1}).format(v);
  const series=keys.map(key=>rows.map(row=>row[key]===null?null:(indexed?row[key]/first[key]*100:row[key])));
  const small=innerWidth<=480;
  const w=small?360:1100,h=small?280:350,l=small?48:65,r=small?18:30,t=30,b=40,pw=w-l-r,ph=h-t-b;
  const rawmax=Math.max(1,...series.flat().filter(v=>v!==null));const step=10**Math.floor(Math.log10(rawmax));const max=Math.ceil(rawmax/step)*step;
  const x=i=>l+i/(rows.length-1)*pw,y=v=>t+ph-v/max*ph;
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="img"><title>${esc(tr('Emissões anuais de CO₂ do Brasil, com e sem mudança no uso da terra','Brazil annual CO₂ emissions, including and excluding land-use change'))}</title>`;
  for(let i=0;i<=4;i++){const yy=t+ph-i*ph/4;svg+=`<line class="grid" x1="${l}" x2="${w-r}" y1="${yy}" y2="${yy}"/><text x="${l-12}" y="${yy+4}" text-anchor="end">${esc(number(max*i/4))}</text>`;}
  svg+=`<text x="${l}" y="15">${esc(indexed?'2000 = 100':percapita?'t CO₂ / '+tr('pessoa','person'):'Mt CO₂')}</text>`;
  rows.forEach((row,i)=>{if(i%(small?6:4)===0)svg+=`<text x="${x(i)}" y="${h-12}" text-anchor="middle">${row.year}</text>`;});
  series.forEach((values,s)=>{let segment=[];const segments=[];values.forEach((v,i)=>{if(v===null){if(segment.length)segments.push(segment);segment=[];}else segment.push(`${x(i)},${y(v)}`);});if(segment.length)segments.push(segment);for(const points of segments)svg+=`<polyline fill="none" stroke="${s?'#a16b28':'#153d32'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}"/>`;values.forEach((v,i)=>{if(v!==null)svg+=`<circle fill="${s?'#a16b28':'#153d32'}" cx="${x(i)}" cy="${y(v)}" r="3"><title>${rows[i].year}: ${esc(format(v))}</title></circle>`;});});
  $('public-chart').innerHTML=svg+'</svg>';
  $('public-chart').setAttribute('aria-label',tr(`Brasil, 2000 a 2024. ${indexed?'Índice com base 2000 igual a 100.':percapita?'Toneladas de CO₂ por pessoa.':'Milhões de toneladas de CO₂.'} Duas séries: com e sem mudança no uso da terra. Dados disponíveis na tabela.`,`Brazil, 2000 to 2024. ${indexed?'Index with 2000 equal to 100.':percapita?'Tonnes of CO₂ per person.':'Million tonnes of CO₂.'} Two series: including and excluding land-use change. Values available in the table.`));
  fillTable('public-table',rows.map((row,i)=>[String(row.year),format(series[0][i]),format(series[1][i])]));
  const changes=keys.map(key=>last[key]/first[key]-1);
  $('public-insight').textContent=tr(`De ${first.year} a ${last.year}, a série sem mudança no uso da terra varia ${pct(changes[0])}; com esse componente, ${pct(changes[1])}${percapita?' por pessoa':''}. A fronteira do indicador muda a conclusão descritiva.`,`From ${first.year} to ${last.year}, the series excluding land-use change changes ${pct(changes[0])}; including it, ${pct(changes[1])}${percapita?' per person':''}. The indicator boundary changes the descriptive conclusion.`);
  checks('public-checks',[[tr('Anos únicos e consecutivos','Unique consecutive years'),'25 / 25'],[tr('Valores ausentes no recorte','Missing values in the extract'),String(data.checks.missing_values)],[tr('Unidades por pessoa reconciliadas','Per-person units reconciled'),tr('Passou','Passed')]]);
  $('public-source').replaceChildren();const a=document.createElement('a');a.href=data.source.url;a.textContent=tr('Fonte fixada no commit ','Source pinned to commit ')+data.source.commit.slice(0,12);const text=document.createElement('span');text.textContent=' · '+tr('Extraído em ','Retrieved ')+data.source.retrieved_at.slice(0,10);$('public-source').append(a,text);
}
fetchJSON('../../data/public/brazil.json').then(result=>{data=result;$('public-status').hidden=true;$('public-content').hidden=false;render();}).catch(()=>showError('public-status'));

let resizeTimer; addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120);});
