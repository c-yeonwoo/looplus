import type { GoalReachStatus, ProjectionResult, Vision } from "../types";
import { needsRealityNudge } from "./projection";

/**
 * 목표 상태를 화면이 아니라 데이터에서 정한다.
 *
 * 이전에는 "목표 숫자가 없다"는 규칙이 home/page.tsx 의 JSX 문자열로만 존재해서,
 * 같은 상태를 두고 홈은 "참고용이에요"라고 달래고 엔진은 "시점 내 미도달 · 달성 0.0%"라고
 * 선고했다. 홈·엔진·공유카드가 모두 이 셀렉터를 구독한다.
 */

/** 목표 미설정 안내 문구 — 표면마다 다시 쓰지 않는다. */
export const GOAL_GUARD_COPY = {
  title: "목표 숫자를 먼저 정해요",
  /** 좁은 자리(히어로 한 줄)용 */
  short: "숫자 목표가 없으면 곡선은 참고용이에요. 목표를 정해 주세요.",
  /** 카드 본문용 */
  body: "순자산·패시브 목표가 없으면 억 단위 곡선은 참고용일 뿐이에요.",
} as const;

export interface GoalState {
  /** 순자산 또는 월 패시브 중 하나라도 숫자로 정해져 있는가 */
  hasNumericGoal: boolean;
  targetStatus: GoalReachStatus;
  /** 억 단위 예측을 단독 수치로 내세워도 되는가 */
  showBigNumbers: boolean;
  /** amber 현실 넛지를 띄울지 — 미설정 상태에서는 절대 false */
  showRealityNudge: boolean;
  /** 「목표 도달까지」 값 */
  reachLabel: string;
  /** 위 값의 보조 설명 */
  reachSub: string;
  /** 달성률 — 목표 미설정이면 null (0.0% 로 렌더하면 실패로 읽힌다) */
  achievementPct: number | null;
  /** 미설정일 때만 안내 문구, 그 외에는 null */
  guardCopy: typeof GOAL_GUARD_COPY | null;
}

/**
 * 공유 카드처럼 React 밖에서 그리는 표면용 도달 칩 문구.
 * 미설정이면 null — 칩 자체를 그리지 않는다.
 */
export function reachChipLabel(
  status: GoalReachStatus,
  reachYear: number | null,
): string | null {
  if (status === "unset") return null;
  return reachYear != null ? `도달 약 ${reachYear}년` : "시점 내 미도달";
}

type ProjectionSlice = Pick<
  ProjectionResult,
  "targetStatus" | "targetReachYear" | "achievementPct"
>;

export function selectGoalState(
  vision: Vision | null | undefined,
  projection: ProjectionSlice | null | undefined,
): GoalState {
  const hasNumericGoal =
    (vision?.goalNetworth ?? 0) > 0 || (vision?.goalPassiveIncome ?? 0) > 0;
  const targetYears = vision?.targetYears ?? 0;

  // 프로젝션이 아직 없으면 비전만으로 판정한다 (홈 빈 상태 등).
  const targetStatus: GoalReachStatus =
    projection?.targetStatus ?? (hasNumericGoal ? "not_reached" : "unset");

  if (!hasNumericGoal) {
    return {
      hasNumericGoal: false,
      targetStatus: "unset",
      showBigNumbers: false,
      showRealityNudge: false,
      reachLabel: "목표 미설정",
      reachSub: "목표를 정하면 도달 연도가 계산돼요",
      achievementPct: null,
      guardCopy: GOAL_GUARD_COPY,
    };
  }

  const reachYear = projection?.targetReachYear ?? null;
  const pct = projection?.achievementPct ?? null;
  return {
    hasNumericGoal: true,
    targetStatus,
    showBigNumbers: true,
    showRealityNudge: needsRealityNudge(targetStatus, reachYear, targetYears),
    reachLabel: reachYear != null ? `약 ${reachYear}년` : "시점 내 미도달",
    reachSub:
      pct != null
        ? `현재 달성 ${pct.toFixed(1)}% · 지금 순자산÷목표`
        : "지금 순자산÷목표",
    achievementPct: pct,
    guardCopy: null,
  };
}
