---
name: Looplus — 일상 친구
description: 작은 실천을 먼저 읽고, 함께하는 친구가 변화를 기억하는 생활 도구.
colors:
  coral: "#bd4b43"
  coral-deep: "#a13e37"
  coral-wash: "#fff0e8"
  growth: "#fff0b3"
  growth-ink: "#71541c"
  explore: "#e9efff"
  explore-ink: "#3d588f"
  paper: "#fffefa"
  white: "#ffffff"
  canvas: "#f6f5f1"
  ink: "#29334a"
  ink-secondary: "#475569"
  ink-muted: "#64748b"
  line: "#e2e8f0"
  field-line: "#cbd5e1"
  invest: "#f59e0b"
  save: "#10b981"
  spend: "#e11d48"
typography:
  headline:
    fontFamily: '"LINE Seed KR", ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"LINE Seed KR", ui-sans-serif, system-ui, sans-serif'
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  section:
    fontFamily: '"LINE Seed KR", ui-sans-serif, system-ui, sans-serif'
    fontSize: "17px"
    fontWeight: 700
  body:
    fontFamily: '"LINE Seed KR", ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"LINE Seed KR", ui-sans-serif, system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 400
rounded:
  nav: "8px"
  card: "12px"
  field: "12px"
  scene: "16px"
  dialog: "20px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  section: "28px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.coral-deep}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  day-selected:
    backgroundColor: "{colors.coral-wash}"
    textColor: "{colors.coral-deep}"
    rounded: "{rounded.field}"
    padding: "8px"
  focus-card:
    backgroundColor: "{colors.coral-wash}"
    rounded: "{rounded.scene}"
    padding: "22px"
  growth-dialog:
    backgroundColor: "{colors.growth}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
  nav-goals-active:
    backgroundColor: "{colors.explore}"
    textColor: "{colors.explore-ink}"
---

# Design System: Looplus

## Overview

**Creative North Star: "일상 친구"**

작은 실천을 먼저 읽고, 함께하는 친구가 변화를 기억한다. 따뜻한 종이 지면과 선명한 행동 버튼, 짧고 다정한 문장으로 오늘 할 일을 쉽게 찾게 한다.

캐릭터 루는 기록 옆의 동반자다. 사용자가 돌봐야 할 또 하나의 과제가 되지 않으며, 실제량과 성장 소품을 구분한다.

**Key Characteristics:**

- 코랄 행동, 옐로 성장, 블루 선택·정보.
- 실제 파일로 제공하는 LINE Seed KR의 두 굵기.
- 여백·구분선 목록과 필요한 장면의 색면.
- 실제 기록을 기억하는 절제된 정지 캐릭터.

2026-10-25 구현 기준: `src/app/globals.css`, `AppShell`, `TodayPanel`, `HabitCreate`, `Character`, `GrowthDialog`. frontmatter는 문서상 토큰 기준, 실행 코드는 CSS, 확장·샘플은 `.impeccable/design.json`이다. 화면 구성은 [구현 계약](docs/design/DAILY_COMPANION_BRIEF.md), 제품 범위는 [PRODUCT.md](PRODUCT.md)를 따른다.

## Colors

종이·잉크의 바탕 위에 서로 다른 역할의 세 색면을 둔다.

### Primary

- **Coral / coral-deep:** 주요 기록·다음 단계 행동과 눌림·포커스. `gold-*`는 기존 코드 호환 이름이며 현재 값은 코랄이다.
- **Coral wash:** 오늘 집중 루틴과 선택된 반복 요일의 바탕.

### Secondary

- **Growth / growth-ink:** 성장 기록 장면, 기록 탭 선택 상태, 활동 아이콘의 밝은 면과 짙은 글자.

### Tertiary

- **Explore / explore-ink:** 루틴 선택 도입부, 선택 표시, 정보 안내와 목표 탭 선택 상태. `sage-*`도 현재 블루 계열 호환 토큰이다.

### Neutral

- **Paper / white / canvas:** 앱의 따뜻한 지면, 입력·내비게이션의 흰 면, 바깥 기본 배경.
- **Ink / ink-secondary / ink-muted:** 제목·본문, 보조 설명, 덜 중요한 상태.
- **Line / field-line:** 목록 구분과 입력·선택 윤곽.

**The Separate Meanings Rule.** 코랄·옐로·블루의 생활 UI 역할과 투자·저축·지출의 금융 카테고리 역할을 합치지 않는다.

금융 도구의 `invest-*` amber, `save-*` emerald, `spend-*` rose 및 성공·경고·오류 의미색은 유지한다. 저축 초록은 폐기된 브랜드 액션 색의 재도입이 아니다. 색만으로 선택·성과를 전달하지 않고 글자·선택 표시를 함께 둔다.

## Typography

제목과 본문 모두 **LINE Seed KR**을 사용한다. 정식 Regular(400)·Bold(700) WOFF2를 `public/fonts/line-seed/`에서 self-host하며 `font-display: swap`, `font-synthesis: none`을 적용한다. UI medium은 400, semibold·extrabold는 700으로 매핑한다. 시스템 글꼴은 로딩 실패 시 폴백이다.

화면 제목·중간 제목·절 제목·본문·보조 문구의 크기는 frontmatter의 역할을 따른다. 선택 도입부 제목은 26px이며 좁은 화면에서는 24px, 인사는 17px/1.6이며 좁은 화면에서는 16px다. 전역 body 기본값은 15px/1.5이고 습관 화면은 16px/1.6으로 확장한다. 입력은 16px, 금액·정렬 수치에는 tabular numbers를 쓴다.

**The Real Font Rule.** 로드된 400·700만 사용하며 미제공 서체나 합성 굵기를 현재 제품 서체로 설명하지 않는다.

## Layout

오늘은 최대 520px, 일반 습관 화면은 600px, 생성 흐름은 560px의 가운데 정렬 열이다. 모바일 좌우 여백은 20px다. 768px부터 사이드바와 24px 여백을 사용하고 1024px/1280px에서는 각각 32px/40px로 늘어난다. 넓은 화면에서도 오늘의 읽기 폭을 늘리지 않는다.

모바일 하단 탭은 56px 이상이고 safe-area를 더한다. 본문 하단에는 96px와 safe-area만큼 공간을 확보한다. 생성 흐름은 모바일 하단 탭을 숨긴다. dialog는 모바일 하단 시트, 768px부터 중앙 창이며 최대 폭 560px·높이 90dvh와 내부 스크롤을 제공한다.

주요 동작은 48px 이상, 입력은 50px 이상이다. 요일 선택은 최소 44px 폭이다. 380px 이하에서는 캐릭터와 장면 여백을 줄이며 359px 이하에서는 목록 간격을 줄인다. 긴 사용자 문구는 줄바꿈하고 고정 높이로 자르지 않는다. 이 수치는 웹 CSS 기준이다.

## Elevation & Depth

오늘·선택·성장 화면은 그림자보다 옅은 색면과 구분선으로 깊이를 만든다. dialog의 잉크 40% backdrop은 모달 경계를 드러낸다. 기존 금융 도구의 range thumb에는 작은 그림자가 있으나 동반자 카드의 기본 스타일로 확대하지 않는다.

새 성장에만 380ms의 위로 올라오며 정착하는 진입 연출을 사용한다. `prefers-reduced-motion: no-preference`일 때만 실행한다. 캐릭터의 독서·운동 프레임 애니메이션이나 상시 호흡 모션은 현재 없다. 사이드바 폭 전환은 200ms이며 reduced-motion에서 제거한다.

## Shapes

입력·버튼·아이콘 타일은 부드러운 12px 모서리, 집중·도입 장면은 16px, dialog는 20px를 쓴다. 모바일 시트는 위쪽만 둥글다. 루틴 기록 동작은 48px 원형, 선택 표시도 원형이며 체크 SVG로 상태를 보강한다. 목록 자체를 카드로 반복 포장하지 않는다.

## Components

### Buttons

주요 행동은 코랄 면과 흰 글자, 보조 행동은 흰 면과 윤곽이다. 텍스트 버튼은 짙은 코랄이다. 정밀 포인터의 hover와 active에서 상태를 바꾼다. 습관 영역·탭·사이드바의 키보드 포커스는 짙은 코랄 3px outline과 3px offset이며 전역 기본은 explore-ink다. 비활성 상태는 opacity 0.45와 disabled 의미를 함께 사용한다.

### Chips

반복 요일과 방식 선택은 윤곽 있는 버튼이다. 선택 상태는 코랄 wash·짙은 코랄 윤곽과 `aria-pressed`로 드러낸다. 템플릿 행 선택은 블루 면·체크로 구분한다.

### Cards / Containers

오늘의 집중 루틴은 코랄 wash, 선택 도입은 블루, 성장 dialog는 옐로다. 일반 루틴은 제목·기준·주기·실제 기록과 원형 기록 버튼을 구분선 목록으로 구성한다. 금융 도구의 일반 흰 카드와 의미를 구분한다.

### Inputs / Fields

흰 바탕, field-line 윤곽, 12px 모서리와 읽을 수 있는 label을 둔다. 검색·날짜·수량·텍스트는 최소 50px 높이다. 오류·저장 결과는 텍스트로 전달하고 키보드 포커스로 접근할 수 있다.

### Navigation

오늘·목표·기록의 세 탭을 유지한다. `aria-current="page"`로 현재 위치를 표시하며 목표는 블루, 기록은 옐로 선택 상태를 사용한다. 데스크톱은 접을 수 있는 사이드바, 모바일은 하단 내비게이션이다. 금융 도구는 프로필에서 접근한다.

### Companion

루의 인사·책 읽기·첫 책 축하 세 정지 포즈를 atlas에서 선택한다. 오늘의 기본 크기는 132px, 성장 장면은 최대 235px다. 실제 캐릭터 자산은 레지스트리를 통해 렌더링하며 새 일러스트나 아이콘으로 임의 대체하지 않는다. 알 수 없는 캐릭터·미제작 행동은 기본 정지 포즈로 폴백한다. 자산·보상·미래 진화 구분은 [진화 로드맵](docs/design/companion/EVOLUTION-ROADMAP.md)에 있다.

## Do's and Don'ts

### Do:

- **Do** 행동·성장·선택의 색 역할과 금융 카테고리 색을 구분한다.
- **Do** 실제 기록과 성장 소품을 별개로 설명한다.
- **Do** LINE Seed KR 400·700과 텍스트 상태·키보드 포커스를 유지한다.
- **Do** 캐릭터의 정지 폴백과 동작 줄이기 설정을 존중한다.

### Don't:

- **Don't** 생성된 루틴이나 시안의 수치를 실제 실천으로 표시한다.
- **Don't** 쉬거나 기록을 지웠다는 이유로 친구를 아프게 하거나 소품을 회수한다.
- **Don't** 미제작 진화형·운동 모션·다크 모드를 출시 기능으로 설명한다.
- **Don't** 이전 틸 액션·Pretendard·NeoRound 방향을 현재 시스템으로 되돌린다.
