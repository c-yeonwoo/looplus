# Loop+ (루플러스) — 디자인 시스템

> 브랜드: **Compound Signal** — 잉크 지면 + 신호 틸 CTA.  
> (구 Cool Mist / Quiet Ledger 폐기. 토큰명 `gold-*`는 하위호환으로 Signal teal 값을 담는다.)

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

---

## 2. 컬러 토큰 (`globals.css`)

| 역할 | 토큰 | hex | 용도 |
|---|---|---|---|
| Ink | `brand-900` / `ink-900` | `#0B1220` | 히어로·텍스트 |
| Paper | `ink-50` | `#F3F5F7` | 페이지 배경 |
| Line | `ink-200` | `#D7DEE7` | 보더 |
| Signal CTA | `gold-400/500` | `#0F8B6B` | Primary 버튼·강조 |
| Signal hover | `gold-600` | `#0C7359` | hover |
| Signal wash | `gold-50` | `#DDF3EC` | active nav |
| Sage | `sage-*` | `#2F8F74` 계열 | 다음 한 걸음 |
| Invest | `invest-500` | `#E8A317` | 투자 카테고리만 |
| Save | `save-500` | `#1F9D6A` | 저축 |
| Spend | `spend-500` | `#D6455D` | 지출 |
| Goal line | `goal` | `#0F8B6B` | 차트 목표선 |

---

## 3. 타이포그래피
- **Display**: SUIT Variable 800 · `letter-spacing: -0.03em` (`.font-display`)
- **Body/UI**: Pretendard Variable
- 재무 수치: `.tnum`

---

## 4. 형태
- Radius card/field: **12px** (`0.75rem`)
- 카드: 흰 배경 + `ink-200` 보더 · 과한 그림자 지양
- Primary 버튼: Signal fill → hover `gold-600`

---

## 5. IA
- 사이드바/탭 1차: **홈 · 자산 설계 · 실천**
- 2차: 목표 · 지출
- 진단 = 엔진「내 현황」모달
- 홈: 미리보기 히어로 → 다음 걸음 → 지표 → 비전보드(secondary)
- 로그인: 풀블리드 잉크 브랜드 면 + 폼

---

## 6. 컴포넌트
`Card` · `Button` · `Field` · `NumberInput` · `TextInput` · `Badge` · `StatCard` ·
`SectionTitle` · `EmptyState` · `AssumptionNote` · `Logo`/`LogoMark` · `LeadCta` · `AuthForm`
