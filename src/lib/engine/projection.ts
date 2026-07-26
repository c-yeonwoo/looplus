import type {
  Bucket,
  FinancialSnapshot,
  GoalReachStatus,
  HoldingReturns,
  ProjectionResult,
  YearPoint,
} from "../types";
import { incomeByType } from "./stage";
import {
  bucketBalance,
  residualHoldings,
  resolveHoldingReturns,
} from "./holdings";
import { flattenLeavesForProjection, rootRatioSum } from "./tree";

/**
 * C. 하이브리드 복리 프로젝션.
 *
 *  - 버킷 currentBalance 가 시드(이미 가진 돈). 흐름(ratioPct)은 매달 유입.
 *  - 투자: 미실현=버킷 내 복리 / 실현=다음 해 자본소득으로 재유입.
 *  - 잠금(연금): 실현분도 계좌 안. 저축: 이자도 계좌 안(passive 아님).
 *  - 진단 총액이 버킷 합보다 크면 차액만 잔여로 굴린다 (부분 입력 대비).
 */

export interface ProjectionInput {
  snapshot: FinancialSnapshot;
  buckets: Bucket[];
  horizonYears: number;
  goalNetworth?: number;
  goalPassiveIncome?: number;
  /** 미배분 잔여에만 쓰는 가정 */
  holdingReturns?: HoldingReturns;
}

interface RunState {
  balance: number;
  bucket: Bucket;
}

interface ResidualState {
  balance: number;
  unrealizedRate: number;
  realizedRate: number;
}

function residualStates(
  snapshot: FinancialSnapshot,
  leaves: Bucket[],
  returns: HoldingReturns,
): ResidualState[] {
  const r = residualHoldings(snapshot, leaves);
  const out: ResidualState[] = [];
  if (r.cash > 0) {
    const ret = returns.cash;
    const realizedRate = Math.min(ret.realizedYieldPct, ret.expectedAnnualReturnPct) / 100;
    out.push({
      balance: r.cash,
      unrealizedRate: Math.max(0, ret.expectedAnnualReturnPct / 100 - realizedRate),
      realizedRate,
    });
  }
  if (r.invest > 0) {
    const ret = returns.invest;
    const realizedRate = Math.min(ret.realizedYieldPct, ret.expectedAnnualReturnPct) / 100;
    out.push({
      balance: r.invest,
      unrealizedRate: Math.max(0, ret.expectedAnnualReturnPct / 100 - realizedRate),
      realizedRate,
    });
  }
  return out;
}

export function projectEngine(input: ProjectionInput): ProjectionResult {
  const { snapshot, horizonYears } = input;
  const buckets = flattenLeavesForProjection(input.buckets);
  const horizon = Math.max(1, Math.min(60, Math.round(horizonYears)));
  const returns = resolveHoldingReturns(input.holdingReturns);

  const laborLikeAnnual =
    (incomeByType(snapshot, "labor") +
      incomeByType(snapshot, "platform") +
      incomeByType(snapshot, "freelance")) *
    12;
  const capitalBaseAnnual = incomeByType(snapshot, "capital") * 12;

  const states: RunState[] = buckets.map((bucket) => ({
    bucket,
    balance: bucket.category === "spend" ? 0 : bucketBalance(bucket),
  }));
  const residuals = residualStates(snapshot, buckets, returns);

  const residualTotal = () => residuals.reduce((s, r) => s + r.balance, 0);
  const capitalFromModel = (modelRealized: number) =>
    Math.max(capitalBaseAnnual, modelRealized);

  const curve: YearPoint[] = [];

  const year0BucketRealized = states.reduce((s, st) => {
    const b = st.bucket;
    if (b.category !== "invest" || b.isLocked) return s;
    const rate = Math.min(b.realizedYieldPct, b.expectedAnnualReturnPct) / 100;
    return s + st.balance * rate;
  }, 0);
  const year0ResidualRealized = residuals.reduce(
    (s, r) => s + r.balance * r.realizedRate,
    0,
  );
  const year0ModelRealized = year0BucketRealized + year0ResidualRealized;
  const year0Capital = capitalFromModel(year0ModelRealized);
  const year0Locked = states
    .filter((st) => st.bucket.isLocked)
    .reduce((s, st) => s + st.balance, 0);
  const year0Liquid =
    states
      .filter((st) => !st.bucket.isLocked && st.bucket.category !== "spend")
      .reduce((s, st) => s + st.balance, 0) + residualTotal();

  curve.push({
    year: 0,
    totalNetWorth: year0Liquid + year0Locked - snapshot.liabilities,
    liquidAssets: year0Liquid,
    lockedAssets: year0Locked,
    monthlyPassiveIncome: year0Capital / 12,
    annualIncome: laborLikeAnnual + year0Capital,
    laborAnnual: laborLikeAnnual,
    capitalAnnual: year0Capital,
  });

  let modelRealizedPrev = year0ModelRealized;

  for (let y = 1; y <= horizon; y++) {
    const capitalAnnual = capitalFromModel(modelRealizedPrev);
    const annualIncome = laborLikeAnnual + capitalAnnual;

    let bucketRealized = 0;

    for (const st of states) {
      const b = st.bucket;
      const contribution = annualIncome * (b.ratioPct / 100);

      if (b.category === "spend") continue;

      if (b.category === "invest") {
        const realizedRate = Math.min(b.realizedYieldPct, b.expectedAnnualReturnPct) / 100;
        const unrealizedRate = Math.max(0, b.expectedAnnualReturnPct / 100 - realizedRate);
        const realized = st.balance * realizedRate;
        st.balance = st.balance * (1 + unrealizedRate) + contribution;
        if (b.isLocked) {
          st.balance += realized;
        } else {
          bucketRealized += realized;
        }
      } else {
        st.balance = st.balance * (1 + b.expectedAnnualReturnPct / 100) + contribution;
      }
    }

    let residualRealized = 0;
    for (const r of residuals) {
      residualRealized += r.balance * r.realizedRate;
      r.balance = r.balance * (1 + r.unrealizedRate);
    }

    modelRealizedPrev = bucketRealized + residualRealized;

    const liquid =
      states
        .filter((st) => !st.bucket.isLocked && st.bucket.category !== "spend")
        .reduce((s, st) => s + st.balance, 0) + residualTotal();
    const locked = states
      .filter((st) => st.bucket.isLocked)
      .reduce((s, st) => s + st.balance, 0);

    curve.push({
      year: y,
      totalNetWorth: liquid + locked - snapshot.liabilities,
      liquidAssets: liquid,
      lockedAssets: locked,
      monthlyPassiveIncome: capitalFromModel(modelRealizedPrev) / 12,
      annualIncome,
      laborAnnual: laborLikeAnnual,
      capitalAnnual,
    });
  }

  const goalNetworth = input.goalNetworth ?? 0;
  const goalPassive = input.goalPassiveIncome ?? 0;

  const targetReachYear =
    goalNetworth > 0
      ? curve.find((p) => p.totalNetWorth >= goalNetworth)?.year ?? null
      : null;
  const passiveReachYear =
    goalPassive > 0
      ? curve.find((p) => p.monthlyPassiveIncome >= goalPassive)?.year ?? null
      : null;
  const targetStatus = reachStatus(goalNetworth, targetReachYear);
  const passiveStatus = reachStatus(goalPassive, passiveReachYear);
  const crossoverYear =
    curve.find((p) => p.year > 0 && p.capitalAnnual >= p.laborAnnual && p.laborAnnual > 0)
      ?.year ?? null;

  const current = curve[0].totalNetWorth;
  const achievementPct = goalNetworth > 0 ? (current / goalNetworth) * 100 : 0;
  const last = curve[curve.length - 1];

  return {
    curve,
    targetReachYear,
    targetStatus,
    passiveReachYear,
    passiveStatus,
    achievementPct,
    crossoverYear,
    finalNetWorth: last.totalNetWorth,
    finalMonthlyPassive: last.monthlyPassiveIncome,
  };
}

function reachStatus(goal: number, reachYear: number | null): GoalReachStatus {
  if (goal <= 0) return "unset";
  return reachYear != null ? "reached" : "not_reached";
}

export function ratioSum(buckets: Bucket[]): number {
  return rootRatioSum(buckets);
}

export type SensitivityKey = "conservative" | "base" | "aggressive";

export const SENSITIVITY: Record<SensitivityKey, { label: string; deltaPp: number }> = {
  conservative: { label: "보수", deltaPp: -3 },
  base: { label: "기본", deltaPp: 0 },
  aggressive: { label: "공격", deltaPp: 3 },
};

export function adjustReturns(buckets: Bucket[], deltaPp: number): Bucket[] {
  if (deltaPp === 0) return buckets;
  return buckets.map((b) => {
    if (b.category === "spend") return b;
    const exp = Math.max(0, b.expectedAnnualReturnPct + deltaPp);
    return {
      ...b,
      expectedAnnualReturnPct: exp,
      realizedYieldPct: Math.min(b.realizedYieldPct, exp),
    };
  });
}

export function needsRealityNudge(
  status: GoalReachStatus,
  targetReachYear: number | null,
  targetYears: number,
): boolean {
  if (targetYears <= 0) return false;
  if (status === "unset") return false;
  if (targetReachYear === null) return true;
  return targetReachYear > targetYears * 1.5;
}
