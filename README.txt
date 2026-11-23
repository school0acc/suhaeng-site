수행평가 안내 사이트 — Netlify 배포 방법
==========================================

구성
  public/index.html            화면 (HTML 한 파일)
  netlify/functions/api.mjs    서버 (자료 저장, 관리자 확인, 파일 업로드)
  package.json, netlify.toml   설정

배포 순서 (GitHub 방식 — 가장 확실해요)
  1. 이 폴더 전체를 GitHub 저장소에 올립니다.
  2. Netlify → Add new site → Import an existing project → 그 저장소 선택.
     (Build command는 비워두고, Publish directory는 public 으로 자동 인식돼요.)
  3. Site configuration → Environment variables 에서 두 개 추가:
       ADMIN_ID        = 원하는 관리자 아이디 (안 넣으면 admin)
       ADMIN_PASSWORD  = 원하는 비밀번호 (꼭 넣어야 해요)
  4. Deploys → Trigger deploy 로 다시 배포하면 끝.

사용법
  - 사이트 맨 위 "관리자 로그인"으로 로그인하면 추가·수정·삭제·공지 편집이 가능해요.
  - 로그인하지 않은 사람은 보기, 복사, 다운로드만 할 수 있어요.
  - 비밀번호는 서버에서만 확인하고, 코드 안에는 들어 있지 않아요.

주의
  - 폴더를 Netlify에 그냥 끌어다 놓는 방식(Drag & drop)은 서버 기능의 패키지가
    설치되지 않아 동작하지 않을 수 있어요. GitHub 연결이나 Netlify CLI를 쓰세요.
  - 파일 업로드는 한 파일당 4.5MB까지예요.
  - index.html을 내 컴퓨터에서 그냥 열면 서버가 없어서 샘플 데이터만 보여요.
