import {readFile,writeFile,rename} from 'node:fs/promises';
export function username(value){
 if(typeof value!=='string'||!/^([a-zA-Z0-9_.]{1,30})$/.test(value))throw new Error('대상 사용자명은 @ 없이 영문·숫자·밑줄·마침표 1~30자로 입력하세요.');
 return value.toLowerCase();
}
export function count(value){
 if(!/^(0|[1-9][0-9]*)$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new Error('팔로워 수는 0 이상의 안전한 정수여야 합니다.');
 return Number(value);
}
export function day(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) throw new Error('날짜는 유효한 YYYY-MM-DD 형식이어야 합니다.');
 return value;
}
export function today(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export async function config(){return JSON.parse(await readFile('config.json','utf8'));}
export function validate(rows){
 if(!Array.isArray(rows))throw new Error('기록 형식 오류');
 const dates=new Set();
 for(const r of rows){day(r.date);count(r.followers);if(r.targetUsername!==undefined)username(r.targetUsername);if(dates.has(r.date)||!['manual','official-api','business-discovery','public-page'].includes(r.source)||!Number.isFinite(Date.parse(r.recordedAt)))throw new Error('기록 형식 오류');dates.add(r.date);}
 return rows;
}
export function upsert(rows,entry,replace=false){
 validate(rows);day(entry.date);count(entry.followers);
 const old=rows.find(r=>r.date===entry.date);
 if(old&&!replace)return {rows,changed:false};
 return {rows:validate([...rows.filter(r=>r.date!==entry.date),entry].sort((a,b)=>a.date.localeCompare(b.date))),changed:true};
}
export async function save(entry,replace=false){
 const rows=validate(JSON.parse(await readFile('site/data/history.json','utf8')));
 if(rows.some(r=>r.targetUsername!==entry.targetUsername))throw new Error('다른 계정 또는 이전 형식의 기록이 있습니다. 계정별로 별도 저장소를 사용하세요.');
 const result=upsert(rows,entry,replace);
 if(result.changed){
  const {validateHourly,upsertHourly}=await import('./hourly.mjs');
  let hourly=[];
  try{hourly=validateHourly(JSON.parse(await readFile('site/data/hourly.json','utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(hourly.some(row=>row.targetUsername!==entry.targetUsername))throw new Error('시간별 기록의 계정이 일치하지 않습니다.');
  const nextHourly=upsertHourly(hourly,entry);
  await writeFile('site/data/hourly.json.tmp',JSON.stringify(nextHourly,null,2)+'\n');await rename('site/data/hourly.json.tmp','site/data/hourly.json');
  await writeFile('site/data/history.json.tmp',JSON.stringify(result.rows,null,2)+'\n');await rename('site/data/history.json.tmp','site/data/history.json');
 }
 console.log(result.changed?'기록을 저장했습니다.':'같은 날짜의 기록이 있어 기존 값을 유지했습니다.');
}
