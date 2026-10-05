import type { SnapshotMetrics } from "./engine/stage";
import { currentFor } from "./loops";
import { addDays, dateKey, isRoutineScheduled, mondayOf } from "./tracking";
import type { Profile, WeeklyPlanDecision, WeeklyReview } from "./types";

type WeeklyPlan = {
  focusLoopId?: string;
  planDecision?: WeeklyPlanDecision;
  nextStepLoopId?: string;
};

/** 이번 주 월요일부터 점검 당일까지의 실행과 사용자가 확인한 현황을 고정한다. */
export function buildWeeklyReview(
  profile: Profile,
  metrics: SnapshotMetrics,
  now: Date = new Date(),
  nextStep = "",
  plan: WeeklyPlan = {},
): WeeklyReview {
  const today = dateKey(now);
  const weekStart = mondayOf(today);
  const logs = new Map(profile.tracking.logs.map((log) => [log.date, log.done]));
  const loops = profile.tracking.goalLoops
    .filter((loop) => !loop.completedAt || dateKey(new Date(loop.completedAt)) >= weekStart)
    .map((loop) => {
      const routines = profile.tracking.routines.filter((routine) => routine.loopId === loop.id);
      let scheduled = 0;
      let done = 0;
      for (let day = weekStart; day <= today; day = addDays(day, 1)) {
        for (const routine of routines) {
          const created = new Date(routine.createdAt);
          if (!Number.isNaN(created.getTime()) && dateKey(created) > day) continue;
          if (!isRoutineScheduled(routine, day)) continue;
          scheduled += 1;
          if (logs.get(day)?.[routine.id]) done += 1;
        }
      }
      return {
        loopId: loop.id,
        current: currentFor(loop, profile.snapshot, metrics),
        target: loop.targetValue,
        scheduled,
        done,
      };
    });

  return {
    weekStart,
    checkedAt: now.toISOString(),
    focusLoopId: plan.focusLoopId,
    planDecision: plan.planDecision,
    netWorth: metrics.netWorth,
    savingsRatePct: metrics.savingsRatePct,
    emergencyMonths: profile.snapshot?.emergencyMonths ?? 0,
    capitalMonthly: metrics.capitalMonthly,
    loops,
    nextStep: nextStep.trim().slice(0, 160) || undefined,
    nextStepLoopId: nextStep.trim() ? plan.nextStepLoopId : undefined,
  };
}

export function previousWeeklyReview(
  reviews: WeeklyReview[],
  weekStart: string,
): WeeklyReview | undefined {
  return reviews
    .filter((review) => review.weekStart < weekStart)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
}

/** 저장 이후 현황이나 이번 주 실행이 달라졌는지 알려 준다. */
export function matchesWeeklyReview(saved: WeeklyReview, live: WeeklyReview): boolean {
  if (
    saved.weekStart !== live.weekStart ||
    saved.netWorth !== live.netWorth ||
    saved.savingsRatePct !== live.savingsRatePct ||
    saved.emergencyMonths !== live.emergencyMonths ||
    saved.capitalMonthly !== live.capitalMonthly ||
    saved.focusLoopId !== live.focusLoopId ||
    saved.planDecision !== live.planDecision ||
    saved.nextStep !== live.nextStep ||
    saved.nextStepLoopId !== live.nextStepLoopId ||
    saved.loops.length !== live.loops.length
  ) return false;
  return saved.loops.every((item) => {
    const current = live.loops.find((loop) => loop.loopId === item.loopId);
    return current &&
      item.current === current.current &&
      item.target === current.target &&
      item.scheduled === current.scheduled &&
      item.done === current.done;
  });
}
