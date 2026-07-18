import type { Bucket, EngineConfig, FinancialSnapshot, Profile, Vision } from "../types";
import { emptyTracking } from "../types";
import { BUCKET_PRESETS, bucketFromPreset } from "../catalog";

export const DEFAULT_SNAPSHOT: FinancialSnapshot = {
  cash: 0,
  investAssets: 0,
  realEstate: 0,
  liabilities: 0,
  incomeSources: [
    { type: "labor", monthly: 0 },
    { type: "capital", monthly: 0 },
    { type: "platform", monthly: 0 },
    { type: "freelance", monthly: 0 },
  ],
  monthlySpending: 0,
  emergencyMonths: 0,
};

export const DEFAULT_VISION: Vision = {
  goalNetworth: 100000, // 10억
  goalPassiveIncome: 300, // 월 300만
  targetYears: 15,
  currentAge: undefined,
  why: "",
  scenes: [
    { type: "place", text: "" },
    { type: "day", text: "" },
    { type: "work", text: "" },
    { type: "people", text: "" },
  ],
};

export function emptyProfile(): Profile {
  return {
    vision: null,
    snapshot: null,
    engine: { buckets: [] },
    scenarios: [],
    tracking: emptyTracking(),
    onboardedAt: null,
    updatedAt: new Date(0).toISOString(),
  };
}

/**
 * 진단 데이터로 추천 엔진 초안 생성.
 * spend% ≈ 지출/소득, 나머지를 투자(주식·연금)·저축(비상금)에 분배.
 * 모두 '예시·가정' — 사용자가 자유롭게 수정.
 */
export function suggestEngineFromSnapshot(s: FinancialSnapshot): EngineConfig {
  const totalIncome = s.incomeSources.reduce((sum, i) => sum + i.monthly, 0);
  const spendPct = totalIncome > 0 ? Math.min(90, Math.round((s.monthlySpending / totalIncome) * 100)) : 40;
  const savablePct = 100 - spendPct;

  // 저축(비상금)에 savable의 30%, 투자에 70% (주식 65 : 연금 35)
  const savePct = Math.round(savablePct * 0.3);
  const investPct = savablePct - savePct;
  const stockPct = Math.round(investPct * 0.65);
  const pensionPct = investPct - stockPct;

  const stock = bucketFromPreset(BUCKET_PRESETS.find((p) => p.key === "stock")!, 0);
  stock.ratioPct = stockPct;
  const pension = bucketFromPreset(BUCKET_PRESETS.find((p) => p.key === "pension")!, 1);
  pension.ratioPct = pensionPct;
  const emergency = bucketFromPreset(BUCKET_PRESETS.find((p) => p.key === "emergency")!, 2);
  emergency.ratioPct = savePct;
  const fixed = bucketFromPreset(BUCKET_PRESETS.find((p) => p.key === "fixed")!, 3);
  fixed.ratioPct = spendPct;

  const buckets: Bucket[] = [stock, pension, emergency, fixed];
  return { buckets };
}
