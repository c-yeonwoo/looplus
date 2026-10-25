---
version: 1
slug: "src-components-habits-todaypanel-tsx"
primary_target: "src/components/habits/TodayPanel.tsx"
related_targets: ["src/components/habits/HabitCreate.tsx","src/components/companion/GrowthDialog.tsx","src/app/globals.css"]
---

# 일상 친구 — 구현 계약

Mode: Operate. 대상: 오늘, 성장 장면, 대표 루틴 선택과 공통 앱 토큰.
사용자 승인: 2026-10-25 인라인 시안. 코드로 만든 승인 시안을 실제 데이터에 연결한다.
시안의 예시 날짜·18분 누적·4일 기록은 제품 데이터로 이식하지 않는다.

## Direction contract

THESIS: 해야 할 작은 실천이 먼저 읽히고, 함께 사는 친구가 변화를 기억한다. 게임 대시보드나 실패를 벌주는 펫으로 만들지 않는다.

OWN-WORLD: 코랄은 행동, 옐로는 성장, 블루는 선택·정보. LINE Seed 400/700과 16px 본문, 절제된 표정의 코랄 캐릭터 ‘루’를 사용한다. 금융의 기능색은 보존한다.

STORY: 대표 루틴 하나 선택 → 내 생활에 맞게 설정 → 오늘 실제량 기록 → 성장 순간 확인. 실제 기록·목표 성과·소품 획득은 별도다.

FIRST VIEWPORT: 28px 오늘 제목과 날짜, 약 132px 캐릭터 옆의 짧은 인사, 첫 미실천 루틴의 코랄 행동 버튼, 나머지 목록. 목록에는 가상 루틴을 채우지 않는다. 선택 화면은 블루 도입부와 선택 가능한 목록, 설정 진입 버튼. 성장 장면은 옐로 지면과 중심 캐릭터, 실제 기록 수치.

FORM: 사용자 승인 코드 시안의 확장. 기존 방향 seed 654aa984; 새 방향 경쟁이나 컴포지션 재선정 없이 승인 구조를 따른다. 대표 루틴 6개뿐 아니라 기존 24개 검색·직접 만들기·주기·목표 연결을 보존한다.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 구현 경계

- 첫 실제 실천에는 ‘함께 시작’ 성장, 독서한 서로 다른 4일에는 첫 책. 이는 v1 제품 규칙이며 연속 일수 조건은 없다.
- 보상 원장은 기록과 함께 저장하며 수정·삭제·재기록 시 중복 지급 또는 회수하지 않는다. 과거 실제 기록은 성장 계산에 포함하되 예시 실천은 만들지 않는다.
- 캐릭터 라인, 성장 단계, 행동 포즈/모션 자산을 분리한다. 현재 라인은 루 하나, 승인된 정지 포즈 세 개와 짧은 성장 진입 연출만 출하한다.
- 진화형·루틴별 운동/독서 애니메이션·캐릭터 선택 UI는 후속 세계관·자산 승인 뒤 구현한다. 미제작 자산은 기본 정지 포즈로 안전하게 폴백한다.
- 실제 계정/다중 기기 및 네이티브 실기기 검증은 별도 게이트다.
