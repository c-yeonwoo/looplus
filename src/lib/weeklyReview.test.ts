import { describe, expect, it } from "vitest";
import { emptyProfile } from "./store/defaults";
import { buildWeeklyReview, matchesWeeklyReview, previousWeeklyReview } from "./weeklyReview";
import type { GoalLoop } from "./types";

const loop: GoalLoop = {
  id: "emergency",
  title: "비상금 3개월",
  metric: "emergency_months",
  targetValue: 3,
  createdAt: "2026-09-01T00:00:00Z",
};

const metrics = {
  netWorth: 1200,
  savingsRatePct: 25,
  capitalMonthly: 15,
  totalMonthlyIncome: 400,
  laborLikeMonthly: 385,
  monthlySavable: 100,
  laborSharePct: 96.25,
  capitalSharePct: 3.75,
  passiveToSpendingPct: 7.5,
};

describe("weekly review", () => {
  it("점검일까지 예정된 실행만 세고 당시 금융 수치를 고정한다", () => {
    const profile = emptyProfile();
    profile.snapshot = {
      cash: 300, investAssets: 1000, realEstate: 0, liabilities: 100,
      incomeSources: [], monthlySpending: 200, emergencyMonths: 1.5,
    };
    profile.tracking.goalLoops = [loop];
    profile.tracking.routines = [
      { id: "daily", title: "기록", schedule: "daily", position: 0, loopId: loop.id, createdAt: new Date(2026, 8, 28, 9).toISOString() },
      { id: "monday", title: "점검", schedule: { weekdays: [1] }, position: 1, loopId: loop.id, createdAt: new Date(2026, 8, 28, 9).toISOString() },
    ];
    profile.tracking.logs = [
      { date: "2026-09-28", done: { daily: true, monday: true } },
      { date: "2026-10-01", done: { daily: true } },
    ];

    const review = buildWeeklyReview(profile, metrics, new Date(2026, 9, 3, 12), " 지출 확인 ");
    expect(review.weekStart).toBe("2026-09-28");
    expect(review.netWorth).toBe(1200);
    expect(review.loops).toEqual([{ loopId: "emergency", current: 1.5, target: 3, scheduled: 7, done: 3 }]);
    expect(review.nextStep).toBe("지출 확인");
  });

  it("현재 주를 제외하고 가장 최근 점검을 비교 기준으로 고른다", () => {
    const base = buildWeeklyReview(emptyProfile(), metrics, new Date(2026, 8, 21, 12));
    const recent = buildWeeklyReview(emptyProfile(), metrics, new Date(2026, 8, 28, 12));
    expect(previousWeeklyReview([recent, base], "2026-10-05")?.weekStart).toBe("2026-09-28");
    expect(previousWeeklyReview([recent, base], "2026-09-28")?.weekStart).toBe("2026-09-21");
  });

  it("저장한 뒤 수치나 실행 횟수가 바뀌면 갱신이 필요하다", () => {
    const saved = buildWeeklyReview(emptyProfile(), metrics, new Date(2026, 9, 3, 12));
    expect(matchesWeeklyReview(saved, { ...saved, checkedAt: "later" })).toBe(true);
    expect(matchesWeeklyReview(saved, { ...saved, netWorth: saved.netWorth + 1 })).toBe(false);
  });
});
