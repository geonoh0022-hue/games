# 우리 반 플레이데이 — GitHub + Supabase 배포판

기존 8경기, 1,600개 기본 문제, 팀 점수, 문제 편집, 마피아 역할 배정 화면을 유지하고 서버 저장을 추가한 웹앱입니다. 한 교사가 한 학급/대회를 운영하는 구성입니다. 학생별 답안 제출이나 회원가입은 없습니다.

## 구성

- **GitHub**: 소스 보관 및 변경 이력, 자동 테스트
- **Supabase**: 교사 이메일·비밀번호 인증, 경기 기록 저장
- **Render**: Node.js 웹앱 실행 및 HTTPS 학생 링크 제공

GitHub Pages는 이 앱의 서버를 실행하지 못합니다. GitHub 저장소를 Render의 **Web Service**로 연결하세요. 데이터는 Supabase에 저장되므로 앱 재배포 후에도 유지됩니다.

## 1. Supabase 준비

1. [Supabase](https://supabase.com/dashboard)에서 프로젝트를 만듭니다.
2. **SQL Editor → New query**에서 `supabase/schema.sql` 전체를 붙여 넣고 실행합니다.
3. **Authentication → Users → Add user / Create new user**에서 교사 이메일과 비밀번호로 사용자를 만듭니다. 이메일 확인을 완료하거나 관리 화면의 자동 확인 옵션을 사용합니다.
4. 생성된 교사의 **User UID**를 복사합니다. 이것이 `TEACHER_USER_ID`입니다. 이 ID와 일치하는 교사만 앱을 수정할 수 있습니다.
5. 프로젝트의 **Connect / API 설정**에서 프로젝트 URL, **API Keys**에서 publishable key와 secret key를 확인합니다.
6. 공개 회원가입이 필요하지 않으므로 Authentication 설정에서 신규 가입을 꺼두어도 됩니다. 기존 교사 로그인은 유지됩니다.

사용할 환경 변수:

| 이름 | 넣을 값 |
| --- | --- |
| `SUPABASE_URL` | `https://프로젝트ID.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` 키 (기존 프로젝트는 anon 키도 지원) |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` 키 (기존 프로젝트는 service_role 키도 지원) |
| `TEACHER_USER_ID` | 생성한 교사 사용자의 UID |

**secret/service_role 키는 서버 환경 변수에만 입력하세요. GitHub 파일, 학생 링크, HTML에 넣지 않습니다.** 실제 비밀번호나 API 키는 ZIP에 포함되어 있지 않습니다.

## 2. GitHub에 올리기

1. ZIP을 풀고 `playday-app` 폴더를 엽니다.
2. GitHub에서 새 저장소를 만듭니다. Private 저장소로 만들어도 됩니다.
3. 이 폴더의 **내용 전체**를 저장소 루트에 올립니다. 저장소 첫 화면에서 `package.json`, `server.mjs`, `render.yaml`이 보여야 합니다.
4. `.github`, `.gitignore`, `.env.example` 같은 점으로 시작하는 파일도 포함합니다. `.env` 파일은 올리지 않습니다.

Git을 사용한다면 폴더에서 다음 명령으로 올릴 수 있습니다. 마지막 URL을 본인 저장소 주소로 바꾸세요.

```sh
git init
git add .
git commit -m "Add class playday app"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

GitHub Actions의 테스트는 모의 Supabase를 사용하므로 실제 프로젝트 키 없이 실행됩니다.

## 3. Render에 배포하기

1. [Render](https://dashboard.render.com/)에서 **New → Web Service**를 선택하고 GitHub 저장소를 연결합니다.
2. 다음 값으로 설정합니다.
   - Language / Runtime: **Node**
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
3. **Environment**에 위 Supabase 환경 변수 4개를 입력합니다.
4. `NODE_VERSION`은 `24.19.0`, `NODE_ENV`는 `production`으로 입력합니다.
5. 서비스 요금제를 확인하고 배포합니다. 요금제·휴면 정책·사용 한도는 서비스의 현재 안내를 확인하세요.
6. Render가 발급한 `https://...onrender.com` 주소로 접속합니다. 주소는 Render 환경 변수에서 자동 인식합니다.

또는 **New → Blueprint**에서 저장소를 연결하면 `render.yaml` 설정을 사용할 수 있습니다. 이 경우에도 Supabase 환경 변수 4개를 입력해야 합니다.

사용자 도메인을 연결하거나 다른 호스팅을 쓰면 `APP_ORIGIN=https://실제앱주소`를 추가합니다. 끝에 `/`를 붙이지 마세요. Render에서는 로컬용 `.env.example`의 `APP_ORIGIN=http://localhost:3000` 값을 입력하지 마세요.

## 4. 학생들에게 배포하기

1. 배포 주소의 교사 로그인 화면에서 **Supabase에 만든 교사 이메일·비밀번호**로 로그인합니다.
2. **팀 설정**에서 팀 이름을 정하고, 경기를 선택합니다.
3. **학생 링크 복사** 버튼을 눌러 학급 게시판이나 메신저로 링크를 전달합니다.
4. 학생들은 링크를 열기만 하면 경기 진행, 현재 문제, 남은 시간과 순위를 볼 수 있습니다. 변경 사항은 약 2초 간격으로 반영됩니다.
5. 교사 화면의 **서버 저장 완료** 표시를 확인한 뒤 창을 닫습니다.

학생 링크를 받은 사람은 기록을 볼 수 있습니다. 팀 이름에는 필요한 정보만 사용하세요. 학생 링크가 없어도 교사 로그인 주소는 열리지만, 로그인 없이는 경기 기록이나 교사 화면을 읽고 수정할 수 없습니다.

마피아 역할 명단·편집한 문제 목록·미공개 정답은 학생 API에서 제외됩니다. 스피드 퀴즈와 고요 속의 외침 제시어는 교사 화면에만 표시합니다. 마피아 역할은 기존처럼 종이 쪽지 등으로 개별 전달합니다.

## 5. 로컬 실행

[Node.js](https://nodejs.org/) 24 이상을 설치하고 아래 순서대로 진행합니다. Supabase는 로컬 실행에서도 실제 프로젝트를 사용합니다.

1. `.env.example`을 `.env`로 복사합니다.
2. 4개 Supabase 값을 실제 값으로 바꿉니다.
3. 터미널에서 실행합니다.

```sh
node --env-file=.env server.mjs
```

브라우저에서 `http://localhost:3000`을 엽니다. 외부 npm 라이브러리를 사용하지 않아 별도 패키지 설치가 필요하지 않습니다.

테스트:

```sh
node --test test/*.test.mjs
```

## 운영 및 문제 해결

- **Supabase 요청 실패**: SQL 실행 여부, 프로젝트 URL과 키가 같은 프로젝트 것인지, Data API가 활성화되어 있는지 확인합니다. 서버 로그에는 비밀번호나 키를 출력하지 않습니다.
- **교사 계정만 사용할 수 있다는 메시지**: `TEACHER_USER_ID`와 로그인한 사용자의 UID가 같은지 확인합니다.
- **로그인이 만료됨**: 이 버전은 Supabase access token 만료 시 재로그인합니다. 기본 설정에서는 약 1시간이며 프로젝트 설정에 따라 달라집니다. 자동 연장은 하지 않습니다.
- **다른 교사 화면에서 수정됨**: 여러 창의 덮어쓰기를 막기 위해 저장을 중단합니다. 필요한 미저장 내용을 따로 기록하고 새로고침한 뒤 다시 수정하세요. 가급적 진행용 교사 창 하나를 사용하세요.
- **연결 끊김**: 학생은 마지막 기록과 연결 오류를 표시합니다. 교사는 저장 실패를 표시하고 재시도합니다. 미저장 상태에서 창을 닫으면 해당 변경은 사라질 수 있습니다.
- **기존 HTML 데이터**: 원본 파일은 그대로 남습니다. 브라우저에 저장되어 있던 개인 기록/비밀번호는 자동으로 이관하지 않습니다. 기본 문제는 포함되어 있으며 팀 설정과 편집 내용을 새 앱에 다시 입력할 수 있습니다.
- **학급 분리**: 이 배포는 한 학급용입니다. 여러 학급을 서로 독립적으로 운영하려면 별도의 Supabase 프로젝트와 앱 배포를 사용하세요.
- **백업**: Supabase 백업 기능 또는 SQL Editor/Table Editor를 이용해 `playday_state`를 별도로 백업하세요. 앱의 '대회 기록 초기화'는 현재 점수·완료 기록을 초기화합니다.

## 검증 범위

모의 Supabase REST/Auth 서버를 사용하여 로그인, 권한 차단, 점수 저장·조회, 비공개 정보 제외, 정답 공개, 동시 수정 충돌, 앱 재시작 후 기록 유지를 테스트했습니다. 실제 Supabase 프로젝트 및 Render 계정은 연결하지 않았으므로 배포 후 교사·학생 두 기기로 최종 확인해야 합니다.

## 참고 문서

- [Supabase API 키와 서버 전용 키](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase 이메일·비밀번호 인증](https://supabase.com/docs/guides/auth/passwords)
- [Supabase API 보안](https://supabase.com/docs/guides/api/securing-your-api)
- [Render Node 앱 배포](https://render.com/docs/deploy-node-express-app)
- [Render Blueprint 설정](https://render.com/docs/blueprint-spec)
