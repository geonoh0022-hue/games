# 우리 반 플레이데이 — 이메일·비밀번호 입력 없는 버전

교사는 **관리 링크**, 학생은 **학생 링크**로 바로 접속합니다. 앱에서 회원가입, 교사 이메일 입력, 비밀번호 설정·입력을 하지 않습니다. Supabase Authentication 사용자도 만들 필요가 없습니다.

기존 8경기, 기본 1,600문제, 팀 점수, 문제 편집과 마피아 역할 배정을 유지했습니다. 한 학급/대회를 위한 구성입니다.

## 구성

- GitHub: 코드 저장 및 자동 테스트
- Supabase: 경기·점수·문제 저장
- Render Free: 웹앱 실행과 HTTPS 주소

앱 이용자는 별도 계정이 필요 없습니다. 최초 배포를 하는 사람의 GitHub·Supabase·Render 서비스 계정과 서버 환경 설정은 필요합니다. GitHub Pages에는 서버를 실행할 수 없으므로 Render Web Service를 사용합니다.

## 1. Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다. 재실행해도 기존 경기 데이터는 유지됩니다.
3. 프로젝트 URL과 API Keys의 secret key를 확인합니다.

다음 두 값을 Render 환경 변수에 입력합니다.

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | `https://프로젝트ID.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (기존 service_role 키도 지원) |

secret key는 서버 환경 변수에만 입력합니다. GitHub 코드나 공유 링크에 넣지 않습니다.

## 2. GitHub 업로드

ZIP을 풀어 `playday-app` 폴더 안의 파일과 폴더를 GitHub 저장소 루트에 올립니다. `package.json`, `server.mjs`, `render.yaml`이 저장소 첫 화면에 있어야 합니다. `.github`, `.gitignore`, `.env.example`도 포함합니다. 실제 값을 적은 `.env`는 올리지 않습니다.

## 3. 무료 배포 — Render Blueprint

1. Render의 **New → Blueprint**에서 GitHub 저장소를 연결합니다.
2. `render.yaml`이 앱의 **Free** 요금제를 지정합니다. 화면에서도 무료인지 확인합니다.
3. Supabase URL과 secret key 두 값을 입력하고 배포합니다.
4. **ADMIN_LINK_TOKEN**은 Blueprint가 무작위로 자동 생성합니다. 교사 이메일이나 비밀번호는 설정하지 않습니다.
5. 배포 후 Render 서비스의 **Environment**에서 생성된 `ADMIN_LINK_TOKEN` 값을 확인합니다.
6. 앱 주소 뒤에 `/manage#`와 해당 값을 붙여 **교사 관리 링크**로 보관합니다.

```text
https://내앱.onrender.com/manage#자동생성된_ADMIN_LINK_TOKEN_값
```

위 링크를 열면 입력 화면 없이 교사 화면으로 이동합니다. `ADMIN_LINK_TOKEN`은 Supabase secret key와 다른 값입니다. Supabase 키를 관리 링크에 넣지 마세요.

### 수동으로 Web Service를 만드는 경우

- Runtime: Node
- Build Command: `npm ci`
- Start Command: `npm start`
- Instance Type: **Free**
- Health Check Path: `/api/health`
- `NODE_VERSION`: `24.19.0`
- `NODE_ENV`: `production`
- 위 Supabase 환경 변수 2개
- `ADMIN_LINK_TOKEN`: 아래 명령으로 생성한 임의 값

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Render 기본 주소는 자동 인식합니다. 사용자 도메인을 쓰면 `APP_ORIGIN=https://실제앱주소`를 설정합니다. 끝에 `/`는 붙이지 않습니다.

## 4. 학생 배포

1. 교사 관리 링크를 열어 팀과 경기를 설정합니다.
2. 화면 위 **학생 링크 복사** 버튼을 누릅니다.
3. 복사한 `/s/…` 링크만 학생에게 전달합니다.
4. 학생은 가입·로그인 없이 진행 상황과 순위를 보고, 변경 사항은 약 2초마다 반영됩니다.

**교사 관리 링크를 아는 사람은 점수·문제·마피아 역할을 읽고 수정할 수 있습니다.** 학생에게 관리 링크를 전달하지 마세요. 관리 링크는 신뢰하는 교사만 보관하세요. 학생 링크로는 관리 권한을 얻을 수 없습니다.

마피아 역할 명단, 미공개 정답, 전체 문제 목록은 학생 API에서 제외합니다. 스피드 퀴즈·고요 속의 외침 제시어도 교사 화면에만 표시합니다.

관리 링크의 비밀 값은 URL의 `#` 뒤에 있어 일반 URL 요청에는 포함되지 않습니다. 관리 권한 확인 후 주소에서 제거하고 HttpOnly 쿠키를 사용합니다. 브라우저는 최대 30일 동안 관리 권한을 유지합니다. 공유 컴퓨터에서는 **관리 화면 나가기**를 누르세요. 다시 들어갈 때는 저장한 관리 링크를 열면 됩니다.

## 기존 배포에서 업데이트

1. 기존 GitHub 코드를 이 ZIP의 파일로 교체합니다. 예전 `public/login.html`, `public/login.js`는 삭제합니다.
2. `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`는 그대로 유지합니다.
3. Render에 `ADMIN_LINK_TOKEN`을 추가합니다. Blueprint 재동기화 시 자동 생성하거나 위 명령으로 직접 생성할 수 있습니다.
4. 더 이상 쓰지 않는 `TEACHER_USER_ID`, `SUPABASE_PUBLISHABLE_KEY`는 제거해도 됩니다.
5. 재배포 후 새로운 교사 관리 링크로 접속합니다. 기존 학생 링크와 Supabase 경기 기록은 유지됩니다. 이전 로그인 쿠키는 관리 권한을 주지 않습니다.

## 로컬 실행

Node.js 24 이상을 설치한 뒤 `.env.example`을 `.env`로 복사합니다. Supabase 값 2개와 무작위 `ADMIN_LINK_TOKEN`을 입력합니다.

```sh
node --env-file=.env server.mjs
```

교사는 `http://localhost:3000/manage#본인의_ADMIN_LINK_TOKEN`을 엽니다. 루트 주소만 열면 공유 링크 안내 화면이 나옵니다.

```sh
node --test test/*.test.mjs
```

테스트는 모의 Supabase를 사용하므로 실제 키가 필요 없습니다.

## 운영

- 무료 이용: GitHub·Supabase·Render의 Free 요금제와 사용 한도 안에서 운영합니다. 동봉된 `render.yaml`은 `plan: free`입니다. 무료 서비스는 휴면과 사용량 제한이 있으므로 수업 전에 접속 상태를 확인하세요.
- 관리 링크 분실: Render Environment에서 토큰을 확인해 링크를 다시 만드세요.
- 관리 링크 유출/교체: `ADMIN_LINK_TOKEN`을 새 무작위 값으로 교체하고 재배포합니다. 이전 관리 링크와 관리 쿠키는 더 이상 사용할 수 없습니다. 학생 링크와 점수는 유지됩니다.
- 저장 오류: '서버 저장 완료'를 확인한 뒤 창을 닫습니다. 연결이 끊기면 재시도하며, 저장하지 않은 상태에서 닫으면 마지막 변경이 사라질 수 있습니다.
- 동시 수정 충돌: 다른 교사 창의 변경을 덮어쓰지 않도록 저장을 중단합니다. 미저장 내용을 따로 기록한 뒤 새로고침하고 다시 수정하세요.
- 백업: Supabase의 `playday_state`를 별도로 백업하세요. 여러 학급을 독립적으로 운영하려면 별도 프로젝트와 앱 배포를 사용합니다.

## 검증 범위

모의 Supabase 서버로 관리 링크 접근, 잘못된 링크·위조 쿠키 거부, 학생 수정 차단, 비공개 정보 제외, 저장 충돌, 재시작 후 기록 유지를 검사했습니다. 실제 Supabase 및 Render 계정에는 연결하지 않았으므로 공개 배포 후 교사·학생 두 기기로 최종 확인하세요.

## 참고

- https://supabase.com/docs/guides/getting-started/api-keys
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
