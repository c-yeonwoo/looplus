# 계측 — 아하 도달률

이 문서는 **아하 도달률** 하나를 재현 가능하게 만드는 것이 목적이다.
정의: _온보딩을 끝낸 사람 중, 엔진에서 자기 배분·시나리오 결과를 한 번이라도 본 비율._

## 켜는 법

키가 없으면 `track()` 은 no-op 다. 코드는 이미 다 깔려 있으니 키만 넣으면 흐른다.

```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # 기본값
```

개발 중 이벤트만 눈으로 확인하려면 키 없이:

```bash
NEXT_PUBLIC_ANALYTICS_DEBUG=1 npm run dev
```

`console.debug("[analytics] …")` 로 이벤트명과 속성이 찍힌다.

## 퍼널

| 단계 | 이벤트 | 비고 |
|---|---|---|
| 분모 | `onboarding_completed` | |
| 분자 | `engine_result_viewed` | 결과 카드가 **실제로 화면에 있을 때**. 세션당 1회 |

PostHog Funnel 로 두 단계를 순서대로 놓으면 그대로 아하 도달률이 된다.

### `aha_engine_allocated` 를 분자로 쓰지 말 것

이 이벤트는 루트 합이 정확히 100%(`sumOk`)일 때만 울린다. 합이 안 맞아도 곡선은 보이므로
**결과 열람보다 좁다**. 배분을 끝까지 맞춘 사람의 비율을 볼 때만 쓴다.

`engine_result_viewed` 의 조건:

- 버킷이 1개 이상 (0개면 곡선이 평평해서 보여줄 게 없다)
- 데스크톱이거나, 모바일에서 「결과」탭이 열려 있음 — 모바일은 탭으로 한쪽을 `display:none`
  으로 감추므로, 「배분」탭에 있는 동안은 열람으로 세지 않는다

속성: `bucket_count` · `sum_pct` · `sum_ok` · `has_numeric_goal` · `target_status` ·
`sensitivity` · `viewport`

`sum_ok` 를 속성으로 실었으니, 필요하면 분자를 "결과 열람"과 "배분까지 완료" 두 갈래로
쪼개 볼 수 있다.

## 이탈 지점

분자가 낮을 때 어디서 끊기는지 보는 이벤트들.

| 이벤트 | 언제 | 속성 |
|---|---|---|
| `income_gate_blocked` | 월수입 0이라 추천·곡선을 막았을 때 | `source`: `empty_card` · `flat_banner` · `canvas_empty` |
| `goal_guard_shown` | 목표 미설정 가드를 띄웠을 때. 화면당 세션 1회 | `surface`: `home` · `engine` |

`income_gate_blocked` 는 **클릭 시점**에 울린다(노출이 아니라 의도가 막힌 순간).
`source` 로 어느 CTA에서 새는지 구분한다.

## 중복 제거

퍼널 단계는 리렌더마다 울리면 분자가 부풀어 비율이 무의미해진다.

| 범위 | 헬퍼 | 키 |
|---|---|---|
| 세션당 1회 | `trackOncePerSession(dedupeKey, event, props)` | `sessionStorage` `looplus_once_*` |
| 브라우저당 1회 | `trackAhaAllocatedOnce` | `localStorage` `looplus_aha_fired` |

새 퍼널 단계를 넣을 때는 `track()` 을 직접 부르지 말고 `trackOncePerSession` 을 쓴다.

## 이벤트 추가 절차

1. `src/lib/analytics.ts` 의 `AnalyticsEvent` 유니온에 추가
2. 같은 파일 `ANALYTICS_EVENTS` 배열에도 추가 (테스트가 목록 기준으로 돈다)
3. 퍼널 단계라면 `src/lib/analytics.test.ts` 에 존재 검증 추가
4. 조건부로 노출되는 UI의 노출을 재려면, 부모에서 `if (x) useEffect(…)` 로 쓰지 말고
   `GoalGuardTracker` 처럼 **조건부 렌더되는 작은 컴포넌트**로 감싼다 (훅 순서 보존)
