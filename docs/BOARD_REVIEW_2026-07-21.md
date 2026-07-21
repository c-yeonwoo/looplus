# Loop+ 리뷰 보드 종합 진단 (2026-07-21)

> 인터랙티브 요약: Cursor Canvas  
> `~/.cursor/projects/Users-ys-choi-dev-private-looplus/canvases/loopplus-board-review.canvas.tsx`  
> 방법: Chrome(Playwright) 워크스루 · 네트워크 관찰 · 레포 대조. as-is 비수용.

## Executive Summary

문제(“미래가 안 보여 실행이 안 된다”)와 솔루션(엔진 조립→복리 미리보기) 방향은 옳다.  
다만 워크스루에서 **배분 배지 400%** 로 아하(100%)·리드 CTA가 막히고, **목표 없이도 홈에 24.1억 곡선**이 떠 거짓 확신을 만든다. BM 스위치(`LEAD_URL`/`PostHog`)는 꺼져 있다. 브랜드는 Cool Mist 슬레이트+스틸블루로 범용 SaaS에 수렴한다.

### 지금 당장 Top 3
1. 엔진 배분 합 표시/판정 버그 수정  
2. `LEAD_URL` + PostHog ON  
3. 목표 미설정 시 억 단위 미리보기 억제 + 목표 넛지  

---

상세 본문(역할별 발견 · ROI 표 · Compound Signal 디자인 토큰 · Now/Next/Later 로드맵 · 미해결 질문)은 Canvas와 동일하다. 이 파일은 레포 스냅샷용이다.

### 관찰 하이라이트
| 플로우 | 관찰 |
|---|---|
| Login | 이메일·비번 OK · 중앙 카드 only · 브랜드 히어로 약함 |
| Onboarding | 테스트 계정 = 목표 먼저 · 스텝 밀도 높음 |
| Engine | 진단 모달 동작 · 초안 다이얼로그 · **수입 배분 400%** |
| Home filled | 단계 4/8 · 24.1억 · 목표 — · 달성 0% · 다음 걸음=부동산 레버리지 |
| Network | auth 200 · REST 테이블 GET 다회 · PostHog 0 · 콘솔 에러 0 |
| Mobile engine | 팔레트≫결과 그래프 (가치 역전) |

### 브랜드 제안 요약 — Compound Signal
- CTA/루프: `#0F8B6B` (스틸블루 `#4A90B8` 폐기)  
- Ink: `#0B1220` · Paper: `#F3F5F7`  
- Display: SUIT 800 · Body: Pretendard  
- IA 1차: 홈 · 자산설계 · 실천 / 2차: 목표 · 지출  
