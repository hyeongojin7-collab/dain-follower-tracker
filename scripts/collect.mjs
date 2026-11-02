import {config,count,today,save,username} from './lib.mjs';
import {pathToFileURL} from 'node:url';
export async function fetchFollowers(env=process.env,request=fetch,options={}){
 const mode=options.mode||'business-discovery';
 const discovery=mode==='business-discovery';
 if(!discovery&&mode!=='official-api')throw new Error('지원하지 않는 수집 방식입니다.');
 const token=discovery?env.FB_USER_ACCESS_TOKEN:env.IG_ACCESS_TOKEN;
 const id=discovery?env.FB_CALLER_IG_USER_ID:env.IG_USER_ID;
 const version=env.IG_API_VERSION;
 const target=username(options.targetUsername||'dxineee');
 if(!token||!/^\d+$/.test(id||'')||!/^v\d+\.0$/.test(version||''))throw new Error('Secrets의 토큰·호출자 숫자 ID와 Variables의 API 버전을 확인하세요.');
 const url=new URL('https://'+(discovery?'graph.facebook.com':'graph.instagram.com')+'/'+version+'/'+id);
 url.searchParams.set('fields',discovery?'business_discovery.username('+target+'){username,followers_count}':'id,username,followers_count');
 let response;
 try{response=await request(url,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new Error('공식 API 연결 실패. 기존 기록은 보존됩니다.');}
 if(!response.ok){
 let code='';try{const body=await response.json();if(Number.isSafeInteger(body?.error?.code))code=' / Meta 코드 '+body.error.code;}catch{}
 throw new Error('공식 API HTTP '+response.status+code+' 오류. 토큰·권한·앱 역할·대상 계정 지원 여부를 확인하세요.');
 }
 let data;try{data=await response.json();}catch{throw new Error('공식 API 응답 형식 오류');}
 if(discovery){data=data.business_discovery;}else if(String(data.id)!==id){throw new Error('승인 계정 ID가 일치하지 않습니다.');}
 if(!data||typeof data.username!=='string'||data.username.toLowerCase()!==target||typeof data.followers_count!=='number')throw new Error('대상 계정의 username/followers_count가 없습니다. 개인·비공개·연령 제한·권한 조건을 확인하세요.');
 return count(data.followers_count);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
 const c=await config();
 if(c.collectionEnabled!==true){console.log('수집이 꺼져 있습니다. config.json의 collectionEnabled를 설정하세요.');}
 else if(c.collectionMode==='manual'){console.log('수동 모드: 자동 수집을 건너뜁니다.');}
 else{
 if(c.collectionMode==='official-api'&&!c.ownerConsent)throw new Error('Instagram Login 직접 조회에는 계정 소유자의 접근 승인이 필요합니다.');
 const followers=c.collectionMode==='public-page'
 ?await (await import('./public-page.mjs')).fetchPublicFollowers(c.targetUsername)
 :await fetchFollowers(process.env,fetch,{mode:c.collectionMode,targetUsername:c.targetUsername});
 await save({date:today(),followers,source:c.collectionMode,targetUsername:username(c.targetUsername),recordedAt:new Date().toISOString()}, true);
 }
 }catch(e){console.error(e.message);process.exitCode=1;}
}
