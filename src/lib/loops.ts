import type { GoalLoop, GoalLoopMetric, FinancialSnapshot, RoutineItem } from "./types";
import type { SnapshotMetrics } from "./engine/stage";
import { clampPct, formatKRW, formatPct } from "./format";

export const LOOP_METRICS: Record<
  GoalLoopMetric,
  { label: string; shortLabel: string; unit: string; defaultTarget: number }
> = {
  networth: {
    label: "순자산 만들기",
    shortLabel: "순자산",
    unit: "만원",
    defaultTarget: 10_000,
  },
  emergency_months: {
    label: "비상금 확보",
    shortLabel: "비상금",
    unit: "개월",
    defaultTarget: 3,
  },
  savings_rate: {
    label: "저축률 만들기",
    shortLabel: "저축률",
    unit: "%",
    defaultTarget: 40,
  },
  passive_income: {
    label: "월 현금흐름 키우기",
    shortLabel: "월 패시브",
    unit: "만원",
    defaultTarget: 100,
  },
  custom: {
    label: "나만의 큰 루프",
    shortLabel: "진행",
    unit: "%",
    defaultTarget: 100,
  },
};

export interface LoopProgress {
  current: number;
  target: number;
  pct: number;
  currentLabel: string;
  targetLabel: string;
  isComplete: boolean;
  smallLoopCount: number;
}

/** 숫자 현황과 실행 루틴을 하나의 큰 루프 상태로 합친다. */
export function getLoopProgress(
  loop: GoalLoop,
  snapshot: FinancialSnapshot | null | undefined,
  metrics: SnapshotMetrics | null | undefined,
  routines: RoutineItem[] = [],
): LoopProgress {
  const target = Math.max(0, loop.targetValue);
  const current = currentFor(loop, snapshot, metrics);
  const pct = target > 0 ? clampPct((current / target) * 100) : 0;
  return {
    current,
    target,
    pct,
    currentLabel: formatLoopValue(loop.metric, current),
    targetLabel: formatLoopValue(loop.metric, target),
    isComplete: Boolean(loop.completedAt) || (target > 0 && current >= target),
    smallLoopCount: routines.filter((routine) => routine.loopId === loop.id).length,
  };
}

export function currentFor(
  loop: GoalLoop,
  snapshot: FinancialSnapshot | null | undefined,
  metrics: SnapshotMetrics | null | undefined,
): number {
  switch (loop.metric) {
    case "networth":
      return Math.max(0, metrics?.netWorth ?? 0);
    case "emergency_months":
      return Math.max(0, snapshot?.emergencyMonths ?? 0);
    case "savings_rate":
      return Math.max(0, metrics?.savingsRatePct ?? 0);
    case "passive_income":
      return Math.max(0, metrics?.capitalMonthly ?? 0);
    case "custom":
      return clampPct(loop.manualProgressPct ?? 0);
  }
}

export function formatLoopValue(metric: GoalLoopMetric, value: number): string {
  if (metric === "networth" || metric === "passive_income") return formatKRW(value);
  if (metric === "emergency_months") return `${value.toFixed(value % 1 === 0 ? 0 : 1)}개월`;
  return formatPct(value, value % 1 === 0 ? 0 : 1);
}

export function remainingLoopCopy(loop: GoalLoop, progress: LoopProgress): string {
  if (progress.isComplete) return "이 큰 루프를 완성했어요. 다음 루프를 열어보세요.";
  if (loop.metric === "custom") return `완성까지 ${formatPct(100 - progress.pct)} 남았어요.`;
  const remaining = Math.max(0, progress.target - progress.current);
  return `${LOOP_METRICS[loop.metric].shortLabel} ${formatLoopValue(loop.metric, remaining)} 남았어요.`;
}
