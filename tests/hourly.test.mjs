import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hourBucket,upsertHourly,validateHourly} from '../scripts/hourly.mjs';
const row=(recordedAt,followers=100,date='2026-11-03')=>({date,followers,recordedAt,source:'public-page',targetUsername:'dxineee'});
test('한국 시간대와 자정의 시간 묶음',()=>{
 assert.equal(hourBucket('2026-11-02T14:59:59Z'),'2026-11-02T23:00:00+09:00');
 assert.equal(hourBucket('2026-11-02T15:00:00Z'),'2026-11-03T00:00:00+09:00');
 assert.throws(()=>hourBucket('invalid'));
});
test('시간당 마지막 성공 값 한 건, 시간 경계와 날짜 경계 보존',()=>{
 let rows=upsertHourly([],row('2026-11-02T14:05:00Z',100,'2026-11-02'));
 rows=upsertHourly(rows,row('2026-11-02T14:55:00Z',101,'2026-11-02'));
 assert.equal(rows.length,1);assert.equal(rows[0].followers,101);
 rows=upsertHourly(rows,row('2026-11-02T14:10:00Z',99,'2026-11-02'));
 assert.equal(rows[0].followers,101);
 rows=upsertHourly(rows,row('2026-11-02T15:00:00Z',102));
 assert.equal(rows.length,2);assert.equal(rows[1].hour,'2026-11-03T00:00:00+09:00');
});
test('하루 24개 시간대와 수집하지 않은 구간 보존',()=>{
 let rows=[];
 for(let hour=0;hour<24;hour++)for(const minute of [0,5,55])rows=upsertHourly(rows,row(`2026-11-03T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+09:00`,hour+minute));
 assert.equal(rows.length,24);assert.ok(rows.every(r=>r.recordedAt.includes(':55:00')));
 assert.equal(upsertHourly([],row('2026-11-03T03:00:00+09:00')).length,1);
 assert.equal(upsertHourly([],row('2026-11-03T03:00:00+09:00',100,'2026-11-01')).length,0);
 assert.throws(()=>validateHourly([...rows,rows[0]]));
 assert.throws(()=>validateHourly([{...rows[0],hour:'2026-11-03T04:00:00+09:00'}]));
});
test('실제 저장: 같은 날짜 한 건과 시간별 두 건, 손상된 시간별 기록은 덮어쓰지 않음',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hourly-save-'));await mkdir(join(root,'site/data'),{recursive:true});
 await writeFile(join(root,'site/data/history.json'),'[]');
 const moduleURL=new URL('../scripts/lib.mjs',import.meta.url).href;
 const save=entry=>spawnSync(process.execPath,['--input-type=module','-e',`import {save} from ${JSON.stringify(moduleURL)};await save(${JSON.stringify(entry)},true);`],{cwd:root,encoding:'utf8',windowsHide:true});
 assert.equal(save(row('2026-11-03T00:05:00+09:00',100)).status,0);
 assert.equal(save(row('2026-11-03T00:55:00+09:00',110)).status,0);
 assert.equal(save(row('2026-11-03T01:05:00+09:00',120)).status,0);
 const daily=JSON.parse(await readFile(join(root,'site/data/history.json'),'utf8'));
 const hourly=JSON.parse(await readFile(join(root,'site/data/hourly.json'),'utf8'));
 assert.equal(daily.length,1);assert.equal(daily[0].followers,120);assert.equal(hourly.length,2);assert.equal(hourly[0].followers,110);
 await writeFile(join(root,'site/data/hourly.json'),'broken');
 assert.notEqual(save(row('2026-11-03T02:05:00+09:00',130)).status,0);
 assert.deepEqual(JSON.parse(await readFile(join(root,'site/data/history.json'),'utf8')),daily);
});
