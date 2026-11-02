import {config,count,day,today,save,username} from './lib.mjs';
try{
 const c=await config();if(c.collectionEnabled!==true)throw new Error('먼저 config.json의 collectionEnabled를 true로 설정하세요.');
 await save({date:day(process.env.RECORD_DATE||process.argv[3]||today()),followers:count(process.env.FOLLOWERS??process.argv[2]),source:'manual',targetUsername:username(c.targetUsername),recordedAt:new Date().toISOString()},process.env.REPLACE==='true'||process.argv.includes('--replace'));
}catch(e){console.error(e.message);process.exitCode=1;}
