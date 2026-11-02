import {config,validate,username} from './lib.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const c=await config();
if(c.publishDashboard!==true)throw new Error('공개 배포하려면 config.json의 publishDashboard를 true로 설정하세요.');
const rows=validate(JSON.parse(await readFile('site/data/history.json','utf8')));
const target=username(c.targetUsername);
if(rows.some(r=>r.targetUsername!==target))throw new Error('계정이 다른 기록은 배포할 수 없습니다.');
await writeFile('site/data/profile.json',JSON.stringify({displayName:c.displayName,targetUsername:target}));
