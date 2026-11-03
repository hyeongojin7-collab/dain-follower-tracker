# 다인이의 팔로워 기록 — 공개 웹페이지 예약 조회

대상: https://www.instagram.com/dxineee/

사용자 PC의 Windows 예약 작업이 5분마다 새 브라우저로 공개 프로필을 열고, 팔로워 표시의 정확한 숫자를 읽어 GitHub에 전송합니다. GitHub Actions는 테스트와 Pages 배포를 담당합니다. 사용자가 개인 계정이어도 됩니다. 기본 경로는 Instagram 계정 로그인·API 토큰·비즈니스 계정을 사용하지 않습니다.

공식 API가 아닌 웹페이지 수집 방식입니다. 초기 요청에서는 공식 API 우선이었으나, 이후 사용자가 정해진 시간에 공개 페이지를 조회하는 방식을 요청하여 기본 경로를 변경했습니다. 로그인·CAPTCHA·차단 우회, 비공개 정보 접근, 쿠키 재사용, 비밀번호 수집은 구현하지 않습니다. 공개 페이지 접근이 자동 실행 환경에서 허용되지 않으면 수집은 실패합니다. 무료 GitHub Actions에서의 매일 성공을 보장하지 않습니다.

## 처음이라면

[초보자용 단계별 안내](시작하기.md)를 열어 1번부터 따라 하세요. 컴퓨터에 개발 도구를 설치하지 않고 GitHub 웹사이트에서 설정할 수 있습니다.

## 프로젝트 내용

- config.json: 계정명·수집 방식·수집 및 공개 여부
- .github/workflows/tracker.yml: 수동 실행, 테스트, 기록 커밋, Pages 배포 (서버의 Instagram 예약 조회는 제거)
- scripts/public-page.mjs: Playwright 브라우저로 공개 프로필의 팔로워 표시만 읽음
- scripts/collect.mjs: 공개 페이지/Business Discovery/Instagram Login 수집 선택
- scripts/record.mjs: 수동 입력과 명시적인 기존 날짜 수정
- site/: 한국어 대시보드, 날짜별 그래프·표, 30/90일 필터, 전체 CSV
- site/data/history.json: 실제 관측한 날짜·숫자·출처·계정명·시각. 현재는 2026-11-02 실제 수집 기록 1건 포함
- tests/: 숫자 파싱·한국 날짜·중복 보존·공식 API 요청·오류 처리 테스트

## 주요 설정

~~~json
{
  "collectionMode": "public-page",
  "collectionEnabled": true,
  "targetUsername": "dxineee",
  "publishDashboard": false,
  "displayName": "다인이의 기록 · @dxineee",
  "ownerConsent": false
}
~~~

publishDashboard와 Actions 변수 PUBLISH_PAGES를 둘 다 true로 바꿔야 공개 배포됩니다. ownerConsent는 선택 가능한 Instagram Login 직접 접근 경로에만 적용되며 공개 페이지/수동 기록/Business Discovery에는 필요하지 않습니다. 이는 법적 권한을 판정하는 설정이 아닙니다.

계정을 바꿀 때는 별도 저장소를 사용하세요. 서로 다른 계정의 기록이 섞이면 저장·배포를 거부합니다. 과거 버전에서 targetUsername이 없는 기록은 계정 확인 후 마이그레이션이 필요합니다.

## 수집 방식과 정확도

사용자 PC의 Windows 작업 스케줄러가 한국 시간 매시 00·05·10·15·20·25·30·35·40·45·50·55분에 하루 최대 288회 실행합니다. 실행 중인 작업과 겹치면 해당 회차는 생략하며, 사이트 반영에는 GitHub 배포 시간이 추가됩니다. PC가 켜져 있고 해당 Windows 사용자로 로그인되어 있어야 합니다. 화면 잠금은 가능합니다. PC가 꺼져 있거나 로그아웃되어 있으면 실행되지 않습니다. 절전 등으로 놓친 작업은 Windows가 가능한 시점에 실행할 수 있습니다. GitHub 서버의 예약 조회는 중복과 접근 제한을 피하기 위해 제거했습니다.

팔로워 링크에 정확한 숫자의 title 속성이 있으면 이를 우선 읽습니다. 없으면 프로필 헤더의 followers/팔로워 라벨과 연결된 숫자를 읽습니다. 추천 계정·팔로잉 수는 수집하지 않습니다. 1.2K·1.2만 같은 축약 표시는 임의로 환산하지 않습니다.

로그인 화면·접근 제한·HTML 변경·라벨 누락·축약 수치·상충 수치가 나오면 실패하고 기존 기록은 보존합니다. 실패한 날짜에 0이나 이전 숫자를 복사하지 않습니다. 그래프는 한국 날짜별로 한 점만 표시합니다. 자동 수집이 같은 날 다시 성공하면 그날의 숫자와 기록 시각을 최신 값으로 교체하고, 다음 날에는 새 날짜를 추가합니다. 지난 날짜에는 그날 마지막으로 성공한 값이 남습니다. 수동 입력은 replace를 선택했을 때만 기존 날짜를 수정합니다. 그래프는 누락 날짜를 연결하지 않습니다. 과거 기록 복원과 개별 팔로워 목록 추적은 제공하지 않습니다.

## 로컬 실행 (선택)

Node.js 24 설치 후 프로젝트 폴더에서:

~~~sh
npm ci
npx playwright install chromium
npm test
npm run collect
npm run serve
~~~

http://localhost:8000 에서 확인합니다. 종료는 Ctrl+C. HTML 파일을 직접 더블클릭하지 마세요.

수동으로 관측한 값을 기록/수정하려면 다음 예시의 숫자를 실제 값으로 바꿉니다.

~~~sh
npm run record -- 738 2026-11-02
npm run record -- 739 2026-11-02 --replace
~~~

날짜를 생략하면 한국 오늘 날짜를 씁니다. 로컬 수정은 커밋·푸시해야 GitHub에 반영됩니다. screenshots의 숫자는 검증용으로 저장하지 않았습니다.

## 선택: Business Discovery 공식 API

이 경로를 사용하려면 **조회하는 사용자가 관리하는 Instagram 프로페셔널 계정과 연결된 Facebook 페이지**가 필요합니다. 대상이 크리에이터라는 사실만으로 사용자 개인 계정에서 호출할 수 있는 것은 아닙니다. 다인이가 앱에 로그인하는 절차 대신 호출자 자신의 Meta 앱과 승인된 자격 증명으로 공개 프로페셔널 계정을 조회합니다.

Meta 앱에서 Instagram API with Facebook Login을 설정합니다. Business Discovery 참조의 instagram_basic, instagram_manage_insights, pages_read_engagement 권한과, 호출자 계정 찾기에 pages_show_list를 확인하세요. Business Manager로 페이지 역할을 부여받은 경우 추가 광고 권한 등 조건이 있을 수 있습니다. 테스트 앱 역할, 접근 수준, App Review, 사업자 인증 등 실제 대시보드 요구 사항을 확인해야 하며, 개발 모드라서 모든 공개 계정 조회가 자동 허용된다고 가정하지 않습니다.

공식 Graph API Explorer에서 Facebook User Access Token을 발급하고 다음을 호출해 본인 페이지에 연결된 Instagram ID를 찾습니다:

~~~text
GET /me/accounts?fields=name,instagram_business_account
~~~

그 결과의 instagram_business_account.id가 **호출자 ID**입니다. 다인이의 ID가 아닙니다. 다음 조회로 지원 여부를 먼저 확인합니다:

~~~text
GET /CALLER_IG_USER_ID?fields=business_discovery.username(dxineee){username,followers_count}
~~~

Secrets에 FB_USER_ACCESS_TOKEN, FB_CALLER_IG_USER_ID를 넣고 Variables에 앱에서 확인한 IG_API_VERSION(v숫자.0 형식)을 등록합니다. config.json의 collectionMode를 business-discovery로 바꿉니다. Instagram Login용 토큰과 혼용하지 마세요.

짧은 테스트 토큰은 만료됩니다. 공식 Facebook 장기 User Access Token 교환 절차로 발급하고 실제 만료 시간을 확인해 갱신·재승인 후 Secret을 교체하세요. 자동 토큰 갱신은 구현하지 않습니다. 공식 Access Token Debugger에서 권한·유형·만료를 확인할 수 있습니다. 토큰·앱 시크릿은 채팅이나 공개 파일에 붙이지 마세요.

Meta 개발자 문서가 이번 확인에서 HTTP 429/접근 실패여서 Business Discovery의 세부 권한 본문 전체를 직접 재검증하지 못했습니다. 접근 가능한 Meta 공식 Postman 문서는 Facebook Login 경로의 페이지 연결 필요성, 다른 프로페셔널 계정의 공개 메타데이터 조회, 개인 계정 접근 제한을 확인해 줍니다. 세부 권한·연령 제한·접근 수준은 아래 공식 Business Discovery 참조와 앱에서 최종 확인해야 합니다. 실계정 API 토큰은 제공되지 않아 호출 성공은 검증하지 않았습니다.

## 선택: 계정 소유자가 승인한 Instagram Login

collectionMode를 official-api로 설정하고 ownerConsent를 true로 바꿉니다. 다인이의 공식 접근 승인 및 instagram_business_basic 권한을 갖춘 토큰을 Secrets의 IG_ACCESS_TOKEN에, 다인이의 숫자 API ID를 IG_USER_ID에 넣습니다. IG_API_VERSION도 필요합니다. 이 경로는 graph.instagram.com을 사용하며 Business Discovery는 graph.facebook.com을 사용합니다.

## 보안·공개 범위·중지

- PR에서는 테스트만 실행하며 Secrets를 넘기지 않습니다. 입력은 셸 코드에 삽입하지 않습니다.
- API 오류 본문·HTML·쿠키·토큰을 로그나 사이트에 저장하지 않습니다. 사이트에는 site 폴더만 배포합니다.
- Pages는 일반적으로 공개입니다. 비공개 저장소라고 사이트까지 비공개인 것은 아닙니다. GitHub Free에서는 공개 저장소로 Pages를 사용할 수 있습니다. 날짜별 기록의 공개 범위를 먼저 정하세요.
- 기록 중지: Actions 워크플로의 Disable workflow 또는 collectionEnabled=false.
- 사이트 삭제: Settings → Pages에서 Unpublish site. PUBLISH_PAGES=false만으로 기존 사이트가 삭제되지는 않습니다.
- 이미 공개된 기록은 커밋 이력·캐시·복제본에 남을 수 있습니다.
- 봇의 커밋이 브랜치 보호나 조직 정책으로 막히면 실패합니다. 강제 푸시는 하지 않습니다.
- 공개 페이지 차단 시 프록시 회전·로그인 쿠키·CAPTCHA 우회 없이 수동 기록으로 전환하세요.

## 공식 참고와 검증 범위

- [Meta 공식 Instagram 컬렉션](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Business Discovery 참조](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery/)
- [Facebook 장기 토큰](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [GitHub 예약 실행](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Pages 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

테스트의 API 응답과 팔로워 라벨은 모의 데이터입니다. 자동 브라우저와 Instagram의 실제 연결 상태는 별도 실행 결과로 확인하세요. GitHub 호스팅 실행은 저장소 업로드 뒤 첫 실행으로 확인해야 합니다. 첫 수집에서 실패하면 대시보드가 빈 상태인 것이 정상입니다.

실제 검증 결과: 2026-11-02 한국 18:38에 새 자동 브라우저로 @dxineee의 공개 프로필을 조회하여 739명을 읽고 저장했습니다. 첨부 화면의 738명을 복사하지 않았습니다. 카드·표·그래프 표시와 기간 필터도 브라우저에서 확인했습니다. 자동 테스트 9개가 통과했습니다. GitHub 서버에서의 조회·커밋·배포는 업로드 후 별도로 확인해야 합니다.


## 디자인 업데이트

파스텔 라벤더·민트·살구색과 아이폰 기본 시스템 글꼴을 적용했습니다. 사용자 제공 토땅이 PNG는 HTML에 포함해 별도 업로드가 필요 없습니다. 제목은 config.json의 displayName을 사용하며 계정명은 별도로 표시합니다. 모바일에서 제목 25px, 주요 숫자 42px, 본문 12~14px를 기준으로 배치합니다. 페이지는 site/index.html, site/style.css, site/app.js 세 파일로 구성하며 기록과 수집 설정은 기존대로 사용합니다.

## PC 자동 운영 검증 (2026-11-02)

Windows 작업 DainFollowerTracker-3Hourly의 실행 간격을 2026-11-03에 5분으로 변경했습니다. 기존 연결을 유지하기 위해 내부 이름만 보존했습니다. 로컬 프로그램이 로그인 없는 새 브라우저에서 숫자를 읽고, Windows 자격 증명 관리자의 GitHub 연결로 기록 파일만 게시합니다. OpenAI 모델과 Codex는 호출하지 않습니다. 실제 예약 실행 경로로 22:13에 773명을 읽고, GitHub push와 Pages 갱신 확인까지 성공했습니다. 일별 기록은 하루 한 건을 유지합니다.

PC의 운영 폴더에 있는 사용안내.md, 상태 확인.cmd, 예약 중지.cmd를 사용하세요. 로그는 state/last-run.json과 state/runs.jsonl에 남습니다. 운영 폴더를 이동하거나 삭제하면 예약이 실행되지 않습니다. GitHub 인증 정보는 저장소나 프로그램 파일에 포함하지 않습니다.
