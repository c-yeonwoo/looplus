# Loop+ (루플러스) — 디자인 시스템

> 브랜드: **Compound Signal** — 잉크 지면 + 신호 틸 CTA.  
> (구 Cool Mist / Quiet Ledger 폐기. 토큰명 `gold-*`는 하위호환으로 Signal teal 값을 담는다.)
> 2026-10-23: 일상 습관 화면을 기존 체계의 확장으로 반영. 흰 지면·잉크·틸을 유지하며 새 시각 정체성을 도입하지 않는다.

---

## 1. 브랜드

| 용도 | 표기 |
|---|---|
| 로고·워드마크 | **Loop+** |
| 영문 식별자 | **Looplus** |
| 한글 | **루플러스** |

- 의미: 자산·현금흐름이 **루프**로 돌고, 돌수록 **플러스**(복리·모멘텀).
- 포지셔닝: 정답을 강요하지 않고, 내가 내 엔진을 조립하도록 곁에서 돕는다.
- 비주얼: **Compound Signal** — `#0B1220` 잉크 + `#0F8B6B` 신호 틸.

**톤 & 보이스**
- 신뢰 핀테크 + 20대 친근. 수익 보장·종목/매물/레버리지 권유 금지.
- 수치 옆 항상 *예시·가정*.

위 금융 중심 설명은 선택형 돈 관리 도구의 기존 맥락이다. 일상 습관 화면은 `PRODUCT.md`의 개인 실천 방향을 따르며,
설정·실제 기록·목표 성과를 구분하는 차분한 문구를 사용한다. 기록이 없는 기간을 실패로 단정하지 않는다.

---

## 2. 컬러 토큰 (`globals.css`)

| 역할 | 토큰 | hex | 용도 |
|---|---|---|---|
| Ink | `brand-900` / `ink-900` | `#0B1220` | 히어로·텍스트 |
| Ink (보조) | `brand-800` | `#141C2B` | 히어로 그라디언트·hover |
| Paper | `ink-50` | `#F3F5F7` | 전역 body 기본 배경·보조 면 |
| App surface | 흰색 | `#FFFFFF` | 앱 셸·습관 화면·입력·시트 |
| Line | `ink-200` | `#E2E8F0` | 보더 |
| Signal wash | `gold-50` | `#DDF3EC` | active nav·서브틀 배경 |
| Signal tint | `gold-100…300` | `#B8E5D4 → #3DB891` | 배지·아이콘 배경 |
| Signal CTA | `gold-400/500` | `#0F8B6B` | Primary 버튼·강조 |
| Signal hover | `gold-600` | `#0C7359` | hover |
| Sage | `sage-*` | `#4D8B82` 계열 | 다음 한 걸음(코치 순간) |
| Invest | `invest-500` | `#F59E0B` | 투자 카테고리만 |
| Save | `save-500` | `#10B981` | 저축 |
| Spend | `spend-500` | `#E11D48` | 지출 |
| Goal line | `goal` | `#0F8B6B` | 차트 목표선 |

**원칙**: 카테고리 색(invest/save/spend)은 기능색으로 유지 — Signal teal(CTA)과 chroma로 구분되도록 배경 대량 도포는 지양.

---

## 3. 타이포그래피
- **기존 Display**: SUIT Variable 800 · `letter-spacing: -0.03em` (`.font-display`). 선택형 기존 화면에 유지한다. CDN(`cdn.jsdelivr.net/gh/sunn-us/SUIT`)에서 `@font-face`로 로드, 실패 시 Pretendard로 폴백.
- **Body/UI**: Pretendard Variable (self-host)
- 재무 수치: `.tnum`

**일상 습관 화면의 범위 한정 확장** (`globals.css`의 habit 스타일):

| 역할 | 실제 설정 | 사용 범위 |
|---|---|---|
| 화면 제목 | Pretendard 700 · `clamp(28px, 4vw, 34px)` · 행간 1.3 · 자간 -0.025em | 오늘·목표·기록·선택·설정 |
| 중간 제목 | Pretendard 700 · 22px · 행간 1.3 | 빈 상태·기록 창 제목 |
| 절 제목 | 17px · 650 | 오늘의 실천·분야별 안내 |
| 본문 | 16px · 행간 1.6 | 습관 페이지; 기존 전역 기본값 15px·1.5는 유지 |
| 입력 | 16px · 400 | 검색·텍스트·수량·날짜·select·textarea |
| 보조 문구 | 주로 14px | 기준·주기·저장 안내; 핵심 제목과 본문을 대신하지 않음 |

제목은 긴 사용자 문구가 줄바꿈되도록 한다. NeoRound는 승인된 향후 제목 방향이지만 파일과 사용 계약을 확보하지 않았으므로
현재 구현 서체로 표기하지 않는다. 기존 Pretendard 패키지를 사용하며 OFL 고지는 `public/licenses/Pretendard-OFL.txt`와 프로필 링크로 제공한다.

---

## 4. 형태
- Radius card/field: **12px** (`0.75rem`)
- 카드: 흰 배경 + `ink-200` 보더 · 과한 그림자 지양
- 기존 Primary 버튼: Signal fill → hover `gold-600`
- 습관 Primary 버튼: `gold-600` 배경 + 흰 글자, hover/active `#095B46`. 기존 틸 팔레트 안에서 대비를 확보한다.
- 습관 화면은 카드 겹치기보다 여백과 `ink-200` 구분선 목록을 사용한다. 항목 이름·기준/주기·진입 또는 기록 행동을 한 줄 구조로 묶되 긴 내용은 줄바꿈한다.
- 습관 페이지 폭은 최대 680px, 생성 흐름은 최대 560px. 모바일 좌우 여백은 20px이며 데스크톱에서 넓어진다.
- 주요 버튼·아이콘 버튼은 최소 높이 48px, 아이콘 버튼은 48×48px. 날짜/요일 버튼은 최소 44px 폭·48px 높이, 입력은 최소 50px 높이, 하단 탭은 최소 56px 높이다. 웹 CSS 수치이며 네이티브 pt/dp 검증을 대신하지 않는다.
- 기록 창은 모바일 하단의 흰 시트(상단 모서리 20px), 768px 이상에서는 중앙 dialog(20px 모서리)다. 배경 dim은 잉크 40%이며 내부 스크롤을 제공한다.
- 키보드 포커스는 틸 3px outline·3px offset, hover는 정밀 포인터에서만 적용한다. 하단 메뉴·시트는 safe-area를 반영하며 장식 애니메이션을 추가하지 않는다.

---

## 5. IA
- 데스크톱 사이드바·모바일 하단탭: **오늘 · 목표 · 기록** (`/home`, `/goals`, `/records`)
- 첫 진입 `/`는 오늘로 연결한다. 생성 흐름 `/routines/new`에서는 모바일 하단탭을 숨겨 선택→설정에 집중한다.
- 프로필→도구에서 자산 현황(`/tools/money`)·자산 설계(`/engine`)·지출(`/spending`)·재무 목표(`/tools/money/goals`)를 연다. 금융은 네 번째 탭이 아니다.
- 루틴 관리·보관은 `/tools/routines`에 있다. 새 일상 루틴과 기존 체크형 관리 영역을 구분한다.
- 진단 = 엔진「내 현황」모달
- 오늘: 날짜·루틴 추가 → 오늘의 실천 → 주 N일 루틴 → 다음 실천. 빈 화면은 첫 루틴 만들기를 우선한다.
- 선택형 자산 현황: 기존 단계 히어로 → N년 미리보기 → 비전보드 → 다음 걸음 → 지표 구성을 유지한다.
- 로그인: 풀블리드 — 좌측 잉크(`brand-900`) 브랜드 면 + 우측 폼 (모바일: 상단 잉크 스트립 + 하단 폼)

---

## 6. 컴포넌트
`Card` · `Button` · `Field` · `NumberInput` · `TextInput` · `Badge` · `StatCard` ·
`SectionTitle` · `EmptyState` · `AssumptionNote` · `Logo`/`LogoMark` · `LeadCta` · `AuthForm`

일상 습관 확장: `HabitCreate` · `TodayPanel` · `HabitRecordDialog` · `HabitGoalsPanel` · `HabitGoalDetail` · `RecordsPanel` · `HabitManage` · `HabitIcon`.
대표 목록은 아이콘·텍스트·구분선으로 구성하고, 전체 목록은 6개 분야를 펼치는 구조다.
설정의 제목/방식·작게 할 때·계기·목표 연결은 필요한 경우 펼친다. 생성과 실천 저장은 별도 행동으로 표시한다.
기록 창에는 날짜와 ‘이날 실제로 한 총량’을 명시하고, 성공/오류는 텍스트로 알린다.
실제 사용자 테스트, 화면 읽기 전체 검사, iOS·Android 큰 글자·실기기 검증 완료를 뜻하지 않는다.
