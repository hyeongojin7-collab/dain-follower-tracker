import {count,day,today,username} from './lib.mjs';
export function hourBucket(recordedAt){
 const timestamp=Date.parse(recordedAt);
 if(!Number.isFinite(timestamp))throw new Error('기록 시각이 올바르지 않습니다.');
 return new Date(timestamp+9*3600000).toISOString().slice(0,13)+':00:00+09:00';
}
export function validateHourly(rows){
 if(!Array.isArray(rows))throw new Error('시간별 기록 형식 오류');
 const hours=new Set();
 for(const row of rows){
  day(row.date);count(row.followers);username(row.targetUsername);
  if(row.hour!==hourBucket(row.recordedAt)||row.date!==row.hour.slice(0,10)||hours.has(row.hour)||!['manual','official-api','business-discovery','public-page'].includes(row.source))throw new Error('시간별 기록 형식 오류');
  hours.add(row.hour);
 }
 return rows;
}
export function upsertHourly(rows,entry){
 validateHourly(rows);
 // 과거 날짜를 수동 입력한 시각을 과거의 실제 관측 시각으로 만들지 않습니다.
 if(entry.date!==today(new Date(entry.recordedAt)))return rows;
 const observation={...entry,hour:hourBucket(entry.recordedAt)};
 const previous=rows.find(row=>row.hour===observation.hour);
 if(previous&&Date.parse(previous.recordedAt)>Date.parse(entry.recordedAt))return rows;
 return validateHourly([...rows.filter(row=>row.hour!==observation.hour),observation].sort((a,b)=>a.hour.localeCompare(b.hour)));
}
