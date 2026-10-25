# Loop+ (루플러스) — 디자인 시스템 안내

2026-10-25 승인된 **일상 친구** 방향이 현재 시스템이다. 토큰·서체·레이아웃·컴포넌트의 정식 기준은 루트 [DESIGN.md](../DESIGN.md), 확장 메타데이터와 독립 HTML/CSS 예시는 [.impeccable/design.json](../.impeccable/design.json)에 있다. 실행 토큰은 [globals.css](../src/app/globals.css)와 대조한다.

## 현재 정체성

- 브랜드 표기는 Loop+ / Looplus / 루플러스다.
- 코랄은 행동, 옐로는 성장, 블루는 선택·정보다. 따뜻한 종이 지면과 잉크 텍스트를 사용한다.
- LINE Seed KR Regular 400·Bold 700을 실제 WOFF2로 self-host한다. 제목·UI에 동일 서체를 쓰며 합성 굵기는 금지한다.
- 루는 인사·책 읽기·첫 책 축하 세 정지 포즈로 현재 기록을 동반한다. 새 성장 장면에만 짧은 진입 연출이 있고 동작 줄이기 설정에서는 실행하지 않는다.
- 예전 Compound Signal의 틸 액션과 Pretendard/SUIT, 향후 NeoRound 방향은 현재 시각 기준이 아니다. `gold-*` 이름은 코랄 값의 호환 토큰이며 `sage-*`는 블루 계열이다.

## 금융 기능의 구분 보존

선택형 금융 도구의 투자·저축·지출 구분은 유지한다. 이 의미색을 일상 화면의 브랜드 역할과 섞지 않는다.

| 금융 역할 | 실행 토큰 | 사용 경계 |
|---|---|---|
| 투자 | `invest-*` amber | 투자 카테고리·차트 |
| 저축 | `save-*` emerald | 저축 카테고리·차트 |
| 지출 | `spend-*` rose | 지출 카테고리·차트 |
| 성공·경고·오류 | `success` / `warning` / `danger` | 상태를 텍스트와 함께 표시 |
| 목표선 | `goal` | 블루 계열 차트 목표선 |

재무 수치는 tabular numbers를 사용한다. 수익·전망에는 예시·가정을 표시하고 수익 보장이나 종목·레버리지 권유로 오해시키지 않는다. 저장된 금융 데이터와 접근 경로를 유지한다.

## 제품과 화면 경계

오늘(`/home`)·목표(`/goals`)·기록(`/records`)이 기본 탐색이다. 생성(`/routines/new`)에서는 모바일 하단 탭을 숨긴다. 프로필→도구에서 자산 현황·자산 설계·지출·재무 목표·루틴 관리에 접근한다.

첫 실제 실천은 함께 시작한 기억, 독서한 서로 다른 4일은 첫 책을 남긴다. 연속일 조건은 없으며 획득 소품은 기록 수정·삭제로 회수하지 않는다. 실제량은 현재 기록에서 다시 계산한다. 세 포즈는 세 진화형이 아니다.

오늘·성장·선택 구현 계약은 [DAILY_COMPANION_BRIEF.md](design/DAILY_COMPANION_BRIEF.md), 후속 세계관·진화·행동 모션 제안은 [EVOLUTION-ROADMAP.md](design/companion/EVOLUTION-ROADMAP.md), 제품 제약은 [PRODUCT.md](../PRODUCT.md)를 따른다.

현재는 밝은 테마의 웹 구현이다. 네이티브 앱 출시·iOS/Android 실기기·실제 계정과 다중 기기 통합·전체 화면 읽기 검증을 완료했다는 뜻은 아니다.
