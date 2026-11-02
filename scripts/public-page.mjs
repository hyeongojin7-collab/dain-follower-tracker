import {count,username} from './lib.mjs';
export function exactNumber(raw){
 const value=raw.trim();
 if(!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(value))throw new Error('축약된 숫자 또는 정확하지 않은 팔로워 수입니다.');
 return count(value.replaceAll(',',''));
}
export function parseFollowerText(text){
 const normalized=text.replaceAll('\u00a0',' ');
 const candidates=[...normalized.matchAll(/(?:^|[\s:])((?:\d[\d,.]*)(?:[KMB만천억])?)\s*(?:followers|팔로워)(?=$|[\s,.])/gi)].map(m=>m[1]);
 candidates.push(...[...normalized.matchAll(/팔로워\s*([\d][\d,.]*(?:[KMB만천억])?)(?:명)?(?=$|[\s])/gi)].map(m=>m[1]));
 if(!candidates.length)throw new Error('프로필에서 팔로워 표시를 찾지 못했습니다.');
 const values=candidates.map(exactNumber);
 if(new Set(values).size!==1)throw new Error('팔로워 수를 확정할 수 없습니다.');
 return values[0];
}
export async function fetchPublicFollowers(target){
 const name=username(target);
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({locale:'en-US',viewport:{width:1280,height:900}});
 await context.route('**/*',route=>['image','media','font'].includes(route.request().resourceType())?route.abort():route.continue());
 const page=await context.newPage();
 let response;try{response=await page.goto('https://www.instagram.com/'+name+'/',{waitUntil:'domcontentloaded',timeout:45000});}catch{throw new Error('공개 프로필을 열지 못했습니다. 기존 기록을 보존합니다.');}
 if(!response||response.status()>=400)throw new Error('공개 프로필 HTTP '+(response?.status()||'오류')+'. 기존 기록을 보존합니다.');
 const url=new URL(page.url());
 if(url.hostname!=='www.instagram.com'||url.pathname.replace(/\/$/,'')!=='/'+name)throw new Error('로그인 또는 다른 페이지로 이동했습니다. 우회하지 않고 종료합니다.');
 try{await page.locator('main header, header section, a[href="/'+name+'/followers/"]').first().waitFor({state:'visible',timeout:15000});}catch{throw new Error('프로필을 표시하지 못했습니다. 로그인·자동 접근 제한일 수 있습니다.');}
 // 팔로워 링크가 있으면 title 속성의 정확한 숫자를 우선 사용합니다.
 const links=page.locator('a[href="/'+name+'/followers/"], a[href="/'+name+'/followers"]');
 const values=[];
 for(let i=0;i<await links.count();i++){
 const link=links.nth(i);if(!await link.isVisible())continue;
 const titled=link.locator('[title]');
 for(let j=0;j<await titled.count();j++){const value=await titled.nth(j).getAttribute('title');if(value&&/^[\d,]+$/.test(value))values.push(exactNumber(value));}
 if(!values.length){try{values.push(parseFollowerText(await link.innerText()));}catch{}}
 }
 if(values.length){if(new Set(values).size!==1)throw new Error('팔로워 표시가 일치하지 않습니다.');return values[0];}
 // 추천 계정·게시물 영역은 제외하고 프로필 헤더에서만 읽습니다.
 const headers=page.locator('main header');
 if(!await headers.count())throw new Error('팔로워 표시 영역을 확인할 수 없습니다.');
 return parseFollowerText(await headers.first().innerText());
 }finally{await browser.close();}
}
