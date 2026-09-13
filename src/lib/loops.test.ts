import { describe, expect, it } from "vitest";
import { getLoopProgress, remainingLoopCopy } from "./loops";
import type { GoalLoop } from "./types";

const base: GoalLoop = {
  id: "loop-1",
  title: "비상금 3개월",
  metric: "emergency_months",
  targetValue: 3,
  createdAt: "2026-09-13T00:00:00.000Z",
};

const snapshot = {
  cash: 300,
  investAssets: 1000,
  realEstate: 0,
  liabilities: 100,
  incomeSources: [],
  monthlySpending: 200,
  emergencyMonths: 1.5,
};

const metrics = {
  netWorth: 1200,
  totalMonthlyIncome: 400,
  laborLikeMonthly: 400,
  capitalMonthly: 30,
  monthlySavable: 100,
  savingsRatePct: 25,
  laborSharePct: 92.5,
  capitalSharePct: 7.5,
  passiveToSpendingPct: 15,
};

describe("getLoopProgress", () => {
  it("큰 루프를 실제 금융 현황과 연결해 진행률을 계산한다", () => {
    const p = getLoopProgress(base, snapshot, metrics, [
      { id: "r1", title: "월 점검", schedule: "daily", position: 0, createdAt: "x", loopId: "loop-1" },
    ]);

    expect(p.current).toBe(1.5);
    expect(p.pct).toBe(50);
    expect(p.smallLoopCount).toBe(1);
    expect(p.isComplete).toBe(false);
  });

  it("사용자 정의 루프는 사용자가 입력한 진행률을 쓴다", () => {
    const p = getLoopProgress(
      { ...base, metric: "custom", targetValue: 100, manualProgressPct: 72 },
      snapshot,
      metrics,
    );
    expect(p.current).toBe(72);
    expect(p.currentLabel).toBe("72%");
    expect(remainingLoopCopy({ ...base, metric: "custom", targetValue: 100, manualProgressPct: 72 }, p)).toContain("28%");
  });

  it("목표를 넘으면 별도 완료 처리 전에도 완성으로 보여 준다", () => {
    const p = getLoopProgress({ ...base, targetValue: 1 }, snapshot, metrics);
    expect(p.isComplete).toBe(true);
  });
});
