const $ = id => document.getElementById(id);
let history = [];
const fmt = n => n.toLocaleString('ko-KR');
const shortDate = date => `${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
const signed = value => value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value))}`;
function svg(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  $('chart').append(el);
  return el;
}
function render() {
  const limit = $('range').value;
  const cutoff = Date.now() - (Number(limit) || 0) * 86400000;
  const data = history.filter(r => limit === 'all' || Date.parse(r.date + 'T23:59:59+09:00') >= cutoff);
  $('rows').replaceChildren();
  for (const row of [...data].reverse()) {
    const index = history.indexOf(row);
    const change = index > 0 ? row.followers - history[index - 1].followers : null;
    const tr = document.createElement('tr');
    for (const text of [row.date.replaceAll('-', '. '), fmt(row.followers), signed(change)]) {
      const td = document.createElement('td'); td.textContent = text; tr.append(td);
    }
    if (change > 0) tr.lastChild.className = 'positive';
    if (change < 0) tr.lastChild.className = 'negative';
    $('rows').append(tr);
  }
  if (!data.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 3; td.className = 'empty'; td.textContent = '기록 없음'; tr.append(td); $('rows').append(tr);
  }
  drawChart(data);
}
function drawChart(data) {
  $('chart').replaceChildren();
  const width = Math.max(240, $('chart').getBoundingClientRect().width - 16);
  const height = width < 500 ? 225 : 250;
  $('chart').setAttribute('viewBox', `0 0 ${width} ${height}`);
  if (!data.length) { svg('text', {x: width/2, y: height/2, 'text-anchor': 'middle'}, '기록 없음'); return; }
  const values = data.map(r => r.followers);
  const min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max(2, Math.ceil((max - min) * .2));
  const lower = Math.max(0, min - padding), upper = max + padding;
  const labelLength = fmt(upper).length;
  const left = Math.max(40, labelLength * 7 + 14), right = width - 26, top = 24, bottom = height - 38;
  const first = Date.parse(data[0].date), last = Date.parse(data.at(-1).date);
  const x = row => first === last ? (left+right)/2 : left + (Date.parse(row.date)-first)/(last-first)*(right-left);
  const y = row => bottom - (row.followers-lower)/(upper-lower)*(bottom-top);
  const ticks = [...new Set([upper, Math.round((upper+lower)/2), lower])];
  for (const value of ticks) {
    const yTick = bottom - (value-lower)/(upper-lower)*(bottom-top);
    svg('line', {x1:left, x2:right, y1:yTick, y2:yTick, class:'grid'});
    svg('text', {x:left-12, y:yTick+4, 'text-anchor':'end'}, fmt(value));
  }
  data.forEach((row, i) => {
    if (i && Date.parse(row.date)-Date.parse(data[i-1].date) === 86400000)
      svg('line', {x1:x(data[i-1]), y1:y(data[i-1]), x2:x(row), y2:y(row), class:'trend'});
    const dot = svg('circle', {cx:x(row), cy:y(row), r:data.length === 1 ? 6 : 4.5, class:'point'});
    const title = document.createElementNS(dot.namespaceURI, 'title');
    title.textContent = `${row.date}: ${fmt(row.followers)}명`; dot.append(title);
  });
  if (data.length === 1) {
    svg('text', {x:x(data[0]), y:y(data[0])-18, 'text-anchor':'middle', class:'point-label'}, fmt(data[0].followers));
    svg('text', {x:x(data[0]), y:height-10, 'text-anchor':'middle'}, shortDate(data[0].date));
  } else {
    svg('text', {x:left, y:height-10}, shortDate(data[0].date));
    svg('text', {x:right, y:height-10, 'text-anchor':'end'}, shortDate(data.at(-1).date));
  }
}
async function start() {
  try {
    const response = await fetch('data/history.json', {cache:'no-store'});
    if (!response.ok) throw Error();
    history = await response.json();
    if (!Array.isArray(history) || history.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isSafeInteger(r.followers) || r.followers < 0)) throw Error();
    history.sort((a,b) => a.date.localeCompare(b.date));
    const last = history.at(-1);
    $('latest').textContent = last ? fmt(last.followers) : '—';
    $('total').textContent = fmt(history.length);
    const delta = history.length > 1 ? last.followers - history.at(-2).followers : null;
    $('delta').textContent = signed(delta); $('delta').nextElementSibling.hidden = delta === null; $('latest').nextElementSibling.hidden = !last;
    $('status').textContent = last ? `기록일 ${last.date.replaceAll('-', '. ')} · 한국 시간` : '기록 없음';
    render();
  } catch {
    history = []; render();
    $('status').textContent = '기록을 불러오지 못했습니다.'; $('export').disabled = true;
  }
  try {
    const response = await fetch('data/profile.json', {cache:'no-store'});
    if (response.ok) {
      const profile = await response.json();
      if (typeof profile.displayName === 'string') {
        const title = profile.displayName.replace(/\s*·\s*@[a-zA-Z0-9_.]+\s*$/, '').trim();
        $('title').textContent = title || '팔로워 기록'; document.title = title || '팔로워 기록';
      }
      if (/^[a-zA-Z0-9_.]{1,30}$/.test(profile.targetUsername || '')) {
        $('account').firstChild.textContent = '@' + profile.targetUsername + ' ';
        $('account').href = 'https://www.instagram.com/' + profile.targetUsername + '/';
      }
    }
  } catch {}
}
$('range').addEventListener('change', render);
$('export').addEventListener('click', () => {
  const csv = '\uFEFFdate,followers,source\n' + history.map(row => [row.date, row.followers, ['manual','business-discovery','official-api','public-page'].includes(row.source) ? row.source : 'unknown'].join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'followers.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
new ResizeObserver(() => render()).observe($('chart'));
start();

