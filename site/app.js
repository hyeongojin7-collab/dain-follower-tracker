const $=id=>document.getElementById(id);let history=[];
const fmt=n=>n.toLocaleString('ko-KR');
function svg(tag,attrs,text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;$('chart').append(el);return el;}
function render(){
 const limit=$('range').value;const cutoff=Date.now()-(Number(limit)||0)*86400000;
 const data=history.filter(r=>limit==='all'||Date.parse(r.date+'T23:59:59+09:00')>=cutoff);
 $('rows').replaceChildren();for(const r of [...data].reverse()){const tr=document.createElement('tr');for(const v of [r.date,fmt(r.followers),r.source==='manual'?'수동 입력':r.source==='business-discovery'?'Business Discovery':r.source==='public-page'?'공개 페이지 조회':'공식 API']){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('rows').append(tr);}
 $('chart').replaceChildren();if(!data.length){svg('text',{x:50,y:150,fill:'#53675f'},'이 기간에는 기록이 없습니다.');return;}
 const values=data.map(r=>r.followers),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 const first=Date.parse(data[0].date),last=Date.parse(data.at(-1).date);
 const x=r=>60+(last===first?390:(Date.parse(r.date)-first)/(last-first)*780),y=r=>240-(r.followers-min)/span*180;
 svg('line',{x1:60,x2:840,y1:240,y2:240,stroke:'#b9cbbb'});svg('text',{x:4,y:60,fill:'#53675f'},fmt(max));svg('text',{x:4,y:240,fill:'#53675f'},fmt(min));
 data.forEach((r,i)=>{if(i&&Date.parse(r.date)-Date.parse(data[i-1].date)===86400000)svg('line',{x1:x(data[i-1]),y1:y(data[i-1]),x2:x(r),y2:y(r),stroke:'#39785f','stroke-width':3});const dot=svg('circle',{cx:x(r),cy:y(r),r:5,fill:'#39785f'});const title=document.createElementNS(dot.namespaceURI,'title');title.textContent=r.date+': '+fmt(r.followers);dot.append(title);});
 svg('text',{x:60,y:280,fill:'#53675f'},data[0].date);svg('text',{x:840,y:280,fill:'#53675f','text-anchor':'end'},data.at(-1).date);
}
async function start(){try{const response=await fetch('data/history.json',{cache:'no-store'});if(!response.ok)throw Error();history=await response.json();if(!Array.isArray(history)||history.some(r=>!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isSafeInteger(r.followers)||r.followers<0))throw Error();history.sort((a,b)=>a.date.localeCompare(b.date));
 const last=history.at(-1);$('latest').textContent=last?fmt(last.followers):'—';$('total').textContent=fmt(history.length);const d=history.length>1?last.followers-history.at(-2).followers:null;$('delta').textContent=d===null?'—':(d>0?'+':'')+fmt(d);
 $('status').textContent=last?'마지막 기록: '+last.date+' · 현재 실시간 수치가 아닙니다.':'아직 기록이 없습니다. 동의 설정 후 첫 기록을 추가하세요.';render();
 try{const p=await fetch('data/profile.json');if(p.ok){const v=await p.json();$('title').textContent=v.displayName||'다인이의 기록';}}catch{}
 }catch{$('status').textContent='기록을 불러오지 못했습니다. 새로고침하거나 관리자에게 문의하세요.';$('export').disabled=true;}}
$('range').addEventListener('change',render);$('export').addEventListener('click',()=>{const csv='\uFEFFdate,followers,source\n'+history.map(r=>[r.date,r.followers,['manual','business-discovery','official-api','public-page'].includes(r.source)?r.source:'unknown'].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='followers.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});start();
