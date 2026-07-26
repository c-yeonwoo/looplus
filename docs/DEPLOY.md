# Loop+ (루플러스) — 배포 · Supabase 운영 가이드

## 1. 로컬 Supabase E2E (검증 완료 경로)

```bash
npm run supabase:start          # Docker 필요 · 마이그레이션 자동 적용
npm run verify:supabase         # 스키마·트리거·RLS·읽기/쓰기 스모크
npm run supabase:stop           # 종료
```

앱에 붙이려면 `.env.local`:

```bash
# supabase status -o env 에서 복사
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

OTP 테스트 메일은 Mailpit: http://127.0.0.1:54324  
Auth → Email 템플릿에 `{{ .Token }}` 이 있어야 6자리 코드 로그인이 동작합니다(클라우드도 동일).

---

## 2. 클라우드 Supabase

무료 플랜은 **조직당 active 프로젝트 2개** 제한이 있다. `cyrano` 전용 프로젝트 생성 시
기존 프로젝트를 pause/삭제하거나 플랜 업그레이드가 필요할 수 있다.

```bash
# 프로젝트 생성 (슬롯 확보 후)
supabase projects create cyrano \
  --org-id <ORG_ID> \
  --db-password <STRONG_PASSWORD> \
  --region ap-northeast-2 \
  --size nano

supabase link --project-ref <REF>
supabase db push

supabase projects api-keys --project-ref <REF> -o env
```

`.env.local` / Railway Variables:

| Key | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable |
| `NEXT_PUBLIC_POSTHOG_KEY` | (선택) 계측 — 없으면 no-op |
| `NEXT_PUBLIC_LEAD_URL` | (선택) 리드젠 CTA — 없으면 "곧 연결" |
| `NEXT_PUBLIC_LEAD_URL_SIGNAL_DESK` | (선택) 주식 버킷 크로스셀 |
| `NEXT_PUBLIC_LEAD_URL_SIGNAL_APT` | (선택) 부동산 버킷 크로스셀 |
| `GEMINI_API_KEY` | (선택) 비전보드 사진 생성 — **서버 전용·런타임**. 없으면 버튼이 안 보임 |
| `GEMINI_IMAGE_MODEL` | (선택) 기본 `gemini-3-pro-image` |

### 운영 스위치 체크리스트 (GA)

1. Supabase URL + publishable → Redeploy → `/login` 에 이메일·비밀번호 폼
2. Auth → **Confirm email 끄기**(또는 SMTP 연결). 안 끄면 가입 시 확인 메일·발송 한도에 막힘
3. Auth Site URL / Redirect URLs에 Railway·localhost 도메인 추가
4. `NEXT_PUBLIC_POSTHOG_KEY` → 온보딩/아하 이벤트 수신
5. `NEXT_PUBLIC_LEAD_URL` → 엔진·홈 CTA가 외부로 열림

로그인: **이메일 + 비밀번호**가 기본. OTP(코드)는 보조(이메일 발송 한도·SMTP 필요).

원격 스모크:

```bash
NEXT_PUBLIC_SUPABASE_URL=… \
NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
SUPABASE_SERVICE_ROLE_KEY=… \
npm run verify:supabase
```

---

## 3. Railway

레포에 `Dockerfile` + `railway.toml` + `output: "standalone"` 이 준비되어 있다.

1. [railway.app](https://railway.app)에서 GitHub `c-yeonwoo/looplus` 연결
2. 서비스 Variables에 위 env 등록 (**필수** — `NEXT_PUBLIC_*` 는 **빌드 시** 번들에 들어감)
3. Variables 저장 후 **Redeploy** (런타임만 바꿔서는 로그인 UI가 안 열림 — 재빌드 필요)
4. Networking → Generate Domain (포트 **3000**)
5. Supabase Auth Site URL / Redirect URLs에 Railway 도메인 추가
6. Deploy → 헬스체크 `GET /api/health`

### `NEXT_PUBLIC_*` 가 빌드에 도달하는 경로

Docker 빌드는 호스트 환경변수와 격리된다. Railway 는 **Dockerfile 빌드에서 서비스
Variables 를 빌드 ARG 로만** 넘기므로([Railway 문서](https://docs.railway.com/builds/dockerfiles)),
Dockerfile builder 스테이지에 `ARG` 선언이 있어야 `next build` 가 값을 읽는다.
선언이 없으면 값이 조용히 비고, 배포된 앱은 로그인이 꺼진 채로 나간다.

새 `NEXT_PUBLIC_*` 를 추가할 때는 **Dockerfile 의 `ARG`/`ENV` 목록에도 넣어야 한다.**
빠뜨리면 `scripts/check-build-env.mjs` 가 빌드를 실패시킨다 (필수 키에 한해).

반대로 `GEMINI_API_KEY` 처럼 **서버에서만 읽는 값은 런타임 변수**라 `ARG` 가 필요 없다.
Railway Variables 에 넣고 재시작하면 재빌드 없이 켜진다. 대신 그 값을 읽는 라우트는
`export const dynamic = "force-dynamic"` 로 정적 프리렌더를 막아야 한다 —
안 그러면 빌드 시점의 "키 없음" 상태가 응답에 굳는다.

로컬 Docker 검증:

```bash
set -a && . ./.env.local && set +a
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -t looplus .
docker run --rm -p 3000:3000 looplus
curl -s http://127.0.0.1:3000/api/health
```

번들에 실제로 인라인됐는지 확인 (URL 이 청크에 박혀 있어야 한다):

```bash
docker run --rm --entrypoint sh looplus -c \
  "grep -rl xxx.supabase.co .next/static | head -3"
```

백엔드 없는 이미지를 의도적으로 만들 때만 `--build-arg ALLOW_NO_SUPABASE=1`.

---

## 4. 컴플라이언스 페이지

| 경로 | 내용 |
|---|---|
| `/legal/disclaimer` | 투자 유의사항 (예시·가정) |
| `/legal/terms` | 이용약관 MVP 초안 |
| `/legal/privacy` | 개인정보 처리방침 MVP 초안 |

법무 검토 전 초안이며, GA 전 문구 감수를 권장한다.
