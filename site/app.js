const $ = id => document.getElementById(id);
let history = [], hourly = [], view = 'daily', hourlyFailed = false;
const fmt = n => n.toLocaleString('ko-KR');
const shortDate = date => `${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
const signed = value => value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value))}`;
const seoulDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const koreanTime = value => new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
function svg(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  $('chart').append(el); return el;
}
function render() {
  const isHourly = view === 'hourly';
  $('daily-control').hidden = isHourly; $('hourly-control').hidden = !isHourly;
  $('view-daily').setAttribute('aria-pressed', String(!isHourly));
  $('view-hourly').setAttribute('aria-pressed', String(isHourly));
  $('time-heading').textContent = isHourly ? '시간' : '날짜';
  $('records-heading').textContent = isHourly ? '시간별 기록' : '일별 기록';
  $('chart').setAttribute('aria-label', `${isHourly ? '시간별' : '일별'} 팔로워 수 그래프. 정확한 값은 아래 기록 표에서 확인할 수 있습니다.`);
  const limit = $('range').value;
  const cutoff = Date.now() - (Number(limit) || 0) * 86400000;
  const date = $('hour-date').value;
  const data = isHourly ? hourly.filter(r => r.date === date) : history.filter(r => limit === 'all' || Date.parse(r.date + 'T23:59:59+09:00') >= cutoff);
  $('chart-detail').textContent = isHourly ? (hourlyFailed ? '시간별 기록을 불러오지 못했어요' : `${data.length} / 24시간 · 한국 시간`) : `${data.length}일 · 한국 시간`;
  $('rows').replaceChildren();
  if (isHourly) {
    const byHour = new Map(data.map(row => [Number(row.hour.slice(11,13)), row]));
    for (let hour = 0; hour < 24; hour++) {
      const row = byHour.get(hour), previous = byHour.get(hour-1);
      addRow([`${String(hour).padStart(2,'0')}:00`, row ? fmt(row.followers) : '—', signed(row && previous ? row.followers-previous.followers : null)], row && previous ? row.followers-previous.followers : null);
    }
  } else {
    for (const row of [...data].reverse()) {
      const previous = history[history.indexOf(row)-1];
      const delta = previous ? row.followers-previous.followers : null;
      addRow([row.date.replaceAll('-', '. '), fmt(row.followers), signed(delta)], delta);
    }
    if (!data.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 3; td.className = 'empty'; td.textContent = '기록 없음'; tr.append(td); $('rows').append(tr);
    }
  }
  $('export').disabled = isHourly ? !data.length : !history.length;
  drawChart(data, isHourly, date);
}
function addRow(texts, change) {
  const tr = document.createElement('tr');
  for (const text of texts) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
  if (change > 0) tr.lastChild.className = 'positive';
  if (change < 0) tr.lastChild.className = 'negative';
  $('rows').append(tr);
}
function drawChart(data, isHourly, date) {
  $('chart').replaceChildren();
  const width = Math.max(240, $('chart').getBoundingClientRect().width - 16);
  const height = width < 500 ? 225 : 250;
  $('chart').setAttribute('viewBox', `0 0 ${width} ${height}`);
  const left = Math.max(40, data.length ? fmt(Math.max(...data.map(r=>r.followers))+2).length*7+14 : 40);
  const right = width-26, top = 24, bottom = height-38;
  const time = row => Date.parse(isHourly ? row.hour : row.date+'T00:00:00+09:00');
  const first = isHourly ? Date.parse(date+'T00:00:00+09:00') : data.length ? time(data[0]) : 0;
  const last = isHourly ? first+23*3600000 : data.length ? time(data.at(-1)) : 0;
  const x = row => first===last ? (left+right)/2 : left+(time(row)-first)/(last-first)*(right-left);
  if (isHourly) {
    for (const hour of (width<500 ? [0,6,12,18,23] : [0,3,6,9,12,15,18,21,23]))
      svg('text', {x:left+hour/23*(right-left),y:height-10,'text-anchor':hour===0?'start':hour===23?'end':'middle',class:'hour-axis'}, `${hour}시`);
  }
  if (!data.length) { svg('text', {x:width/2,y:height/2,'text-anchor':'middle'}, isHourly ? '이 날짜의 시간별 기록이 없어요' : '기록 없음'); return; }
  const values = data.map(r=>r.followers), min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max(2,Math.ceil((max-min)*.2));
  const lower = Math.max(0,min-padding), upper = max+padding;
  const y = row => bottom-(row.followers-lower)/(upper-lower)*(bottom-top);
  for (const value of [...new Set([upper,Math.round((upper+lower)/2),lower])]) {
    const yTick = bottom-(value-lower)/(upper-lower)*(bottom-top);
    svg('line', {x1:left,x2:right,y1:yTick,y2:yTick,class:'grid'});
    svg('text', {x:left-12,y:yTick+4,'text-anchor':'end'}, fmt(value));
  }
  data.forEach((row,i) => {
    if (i && time(row)-time(data[i-1]) === (isHourly ? 3600000 : 86400000))
      svg('line', {x1:x(data[i-1]),y1:y(data[i-1]),x2:x(row),y2:y(row),class:'trend'});
    const dot = svg('circle', {cx:x(row),cy:y(row),r:data.length===1?6:4.5,class:'point'});
    const title = document.createElementNS(dot.namespaceURI,'title');
    title.textContent = `${isHourly ? row.hour.slice(0,16).replace('T',' ') : row.date}: ${fmt(row.followers)}명${isHourly ? ' · '+koreanTime(row.recordedAt)+' 조회' : ''}`;
    dot.append(title);
  });
  if (data.length===1) svg('text', {x:x(data[0]),y:y(data[0])-18,'text-anchor':'middle',class:'point-label'},fmt(data[0].followers));
  if (!isHourly) {
    if (data.length===1) svg('text', {x:x(data[0]),y:height-10,'text-anchor':'middle'},shortDate(data[0].date));
    else {
      svg('text', {x:left,y:height-10},shortDate(data[0].date));
      svg('text', {x:right,y:height-10,'text-anchor':'end'},shortDate(data.at(-1).date));
    }
  }
}
async function loadJSON(path) {const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error();return response.json();}
function validRow(row) {return /^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isSafeInteger(row.followers)&&row.followers>=0&&Number.isFinite(Date.parse(row.recordedAt));}
async function start() {
  try {
    history = await loadJSON('data/history.json');
    if (!Array.isArray(history)||history.some(r=>!validRow(r))) throw Error();
    history.sort((a,b)=>a.date.localeCompare(b.date));
    const last=history.at(-1);
    $('latest').textContent=last?fmt(last.followers):'—'; $('total').textContent=fmt(history.length);
    const delta=history.length>1?last.followers-history.at(-2).followers:null;
    $('delta').textContent=signed(delta); $('delta').nextElementSibling.hidden=delta===null; $('latest').nextElementSibling.hidden=!last;
    $('status').textContent=last?`${koreanTime(last.recordedAt)} 업데이트 · 한국 시간`:'기록 없음';
  } catch {history=[]; $('status').textContent='기록을 불러오지 못했습니다.';}
  try {
    hourly=await loadJSON('data/hourly.json');
    const hours=new Set();
    if(!Array.isArray(hourly)||hourly.some(r=>{
      const bad=!validRow(r)||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00:00\+09:00$/.test(r.hour)||r.date!==r.hour.slice(0,10)||hours.has(r.hour)||new Date(Date.parse(r.recordedAt)+9*3600000).toISOString().slice(0,13)!==r.hour.slice(0,13);
      hours.add(r.hour);return bad;
    }))throw Error();
    hourly.sort((a,b)=>a.hour.localeCompare(b.hour));
  } catch {hourly=[];hourlyFailed=true;}
  $('hour-date').value=hourly.at(-1)?.date||seoulDate(); render();
  try {
    const profile=await loadJSON('data/profile.json');
    if (typeof profile.displayName==='string') {
      const title=profile.displayName.replace(/\s*·\s*@[a-zA-Z0-9_.]+\s*$/,'').trim();
      $('title').textContent=title||'팔로워 기록';document.title=title||'팔로워 기록';
    }
    if (/^[a-zA-Z0-9_.]{1,30}$/.test(profile.targetUsername||'')) {
      $('account').firstChild.textContent='@'+profile.targetUsername+' ';
      $('account').href='https://www.instagram.com/'+profile.targetUsername+'/';
    }
  } catch {}
}
$('range').addEventListener('change',render); $('hour-date').addEventListener('change',render);
for (const mode of ['daily','hourly']) $('view-'+mode).addEventListener('click',()=>{view=mode;render();});
$('export').addEventListener('click',()=>{
  const isHourly=view==='hourly';
  const data=isHourly?hourly.filter(row=>row.date===$('hour-date').value):history;
  const csv='\uFEFF'+(isHourly?'hour,followers,source,recordedAt':'date,followers,source,recordedAt')+'\n'+data.map(row=>[isHourly?row.hour:row.date,row.followers,['manual','business-discovery','official-api','public-page'].includes(row.source)?row.source:'unknown',row.recordedAt].join(',')).join('\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=isHourly?`followers-hourly-${$('hour-date').value}.csv`:'followers.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
new ResizeObserver(()=>render()).observe($('chart'));start();
