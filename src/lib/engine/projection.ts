import type {
  Bucket,
  FinancialSnapshot,
  GoalReachStatus,
  HoldingKind,
  HoldingReturns,
  ProjectionResult,
  YearPoint,
} from "../types";
import { incomeByType } from "./stage";
import {
  HOLDING_KINDS,
  holdingBalance,
  resolveHoldingReturns,
} from "./holdings";
import { flattenLeavesForProjection, rootRatioSum } from "./tree";

/**
 * C. 하이브리드 복리 프로젝션 (§8 · 플로우 12).
 *
 * 핵심 모델:
 *  - 배분 대상 = 연 소득 총액 = (근로+부수입+프리랜서) + 자본소득.
 *  - 각 버킷 유입 = annualIncome × ratio%.
 *  - 투자 버킷: 미실현 수익(주가·시세) = 버킷 내 복리 / 실현 수익(배당·임대·이자)
 *    = 다음 해 '자본소득'으로 upstream 재유입 → 재배분. (하이브리드, 1년 지연)
 *  - 연금·IRP(locked): 실현분도 계좌 내부 복리로 잠김 → passive/재유입 제외, '잠긴 자산'.
 *  - 저축 버킷: 저(무)수익 누적. 지출 버킷: 소비(out), 자산 제외.
 *  - 보유 자산(현금·투자자산·부동산)은 버킷과 별개로 종류별 가정으로 굴린다.
 *    흐름 비율(ratioPct)로 쪼개면 실제 보유 구성과 무관한 배분이 되기 때문. (holdings.ts)
 *
 * 가정 (모두 '예시·가정', README 기록):
 *  - granularity = 연 단위. 급여 성장률·인플레이션 0. 부채 상수.
 *  - 기여는 연말 납입(당해 수익 미발생), 수익은 기초 잔액 기준.
 *  - 버킷은 0에서 시작해 배분액만 쌓인다. 이미 가진 돈은 보유 자산 쪽에 있다.
 */

export interface ProjectionInput {
  snapshot: FinancialSnapshot;
  buckets: Bucket[];
  horizonYears: number;
  goalNetworth?: number;
  goalPassiveIncome?: number; // 월
  /** 보유 자산 수익 가정. 미지정이면 기본값 */
  holdingReturns?: HoldingReturns;
}

interface RunState {
  balance: number;
  bucket: Bucket;
}

interface HoldingState {
  kind: HoldingKind;
  balance: number;
  /** 연 미실현 성장률 (0~1) */
  unrealizedRate: number;
  /** 연 실현률 — 현금으로 빠져나와 수입에 재유입 (0~1) */
  realizedRate: number;
}

function holdingStates(
  snapshot: FinancialSnapshot,
  returns: HoldingReturns,
): HoldingState[] {
  return HOLDING_KINDS.map((kind) => {
    const r = returns[kind];
    const realizedRate = Math.min(r.realizedYieldPct, r.expectedAnnualReturnPct) / 100;
    return {
      kind,
      balance: holdingBalance(snapshot, kind),
      unrealizedRate: Math.max(0, r.expectedAnnualReturnPct / 100 - realizedRate),
      realizedRate,
    };
  }).filter((h) => h.balance > 0);
}

export function projectEngine(input: ProjectionInput): ProjectionResult {
  const { snapshot, horizonYears } = input;
  // 계층 → 리프의 수입 대비 %로 평탄화 후 기존 로직 적용
  const buckets = flattenLeavesForProjection(input.buckets);
  const horizon = Math.max(1, Math.min(60, Math.round(horizonYears)));

  const laborLikeAnnual =
    (incomeByType(snapshot, "labor") +
      incomeByType(snapshot, "platform") +
      incomeByType(snapshot, "freelance")) *
    12;
  /** 진단에 직접 입력한 자본소득 — 대부분 보유 자산에서 나온 실측치 */
  const capitalBaseAnnual = incomeByType(snapshot, "capital") * 12;

  const states: RunState[] = buckets.map((bucket) => ({ bucket, balance: 0 }));
  const holdings = holdingStates(snapshot, resolveHoldingReturns(input.holdingReturns));

  const holdingsTotal = () => holdings.reduce((s, h) => s + h.balance, 0);
  /**
   * 보유 자산발 자본소득 = max(실측, 모델 추정).
   * 사용자가 입력한 자본소득도 결국 이 자산에서 나오는 돈이라, 더하면 같은 돈을 두 번 센다.
   */
  const holdingsCapital = (modelRealized: number) =>
    Math.max(capitalBaseAnnual, modelRealized);

  const curve: YearPoint[] = [];

  // year 0 (현재)
  const year0Realized = holdings.reduce((s, h) => s + h.balance * h.realizedRate, 0);
  const year0Capital = holdingsCapital(year0Realized);
  const year0Liquid = holdingsTotal();
  curve.push({
    year: 0,
    totalNetWorth: year0Liquid - snapshot.liabilities,
    liquidAssets: year0Liquid,
    lockedAssets: 0, // 버킷은 아직 0에서 시작
    monthlyPassiveIncome: year0Capital / 12,
    annualIncome: laborLikeAnnual + year0Capital,
    laborAnnual: laborLikeAnnual,
    capitalAnnual: year0Capital,
  });

  // 전년도 실현분 → 올해 수입으로 재유입 (하이브리드, 1년 지연)
  let holdingRealizedPrev = year0Realized;
  let bucketRealizedPrev = 0;

  for (let y = 1; y <= horizon; y++) {
    const capitalAnnual = holdingsCapital(holdingRealizedPrev) + bucketRealizedPrev;
    const annualIncome = laborLikeAnnual + capitalAnnual;

    let realizedThisYear = 0;

    for (const st of states) {
      const b = st.bucket;
      const contribution = annualIncome * (b.ratioPct / 100);

      if (b.category === "spend") continue; // 소비 (out)

      if (b.category === "invest") {
        const realizedRate = Math.min(b.realizedYieldPct, b.expectedAnnualReturnPct) / 100;
        const unrealizedRate = Math.max(0, b.expectedAnnualReturnPct / 100 - realizedRate);
        const realized = st.balance * realizedRate;
        st.balance = st.balance * (1 + unrealizedRate) + contribution;
        if (b.isLocked) {
          // 실현분도 계좌 내부 복리로 잠김
          st.balance += realized;
        } else {
          realizedThisYear += realized;
        }
      } else {
        // save: 저수익 누적 (이자는 버킷 내 유지, passive 아님)
        st.balance = st.balance * (1 + b.expectedAnnualReturnPct / 100) + contribution;
      }
    }

    // 보유 자산 — 미실현분은 잔액에 남고, 실현분은 현금으로 빠져 다음 해 수입이 된다
    let holdingRealized = 0;
    for (const h of holdings) {
      holdingRealized += h.balance * h.realizedRate;
      h.balance = h.balance * (1 + h.unrealizedRate);
    }

    bucketRealizedPrev = realizedThisYear;
    holdingRealizedPrev = holdingRealized;

    const liquid =
      states
        .filter((st) => !st.bucket.isLocked)
        .reduce((s, st) => s + st.balance, 0) + holdingsTotal();
    const locked = states
      .filter((st) => st.bucket.isLocked)
      .reduce((s, st) => s + st.balance, 0);

    curve.push({
      year: y,
      totalNetWorth: liquid + locked - snapshot.liabilities,
      liquidAssets: liquid,
      lockedAssets: locked,
      // passive = 보유 자산 실현분 + 버킷 실현분 (연금·IRP 실현분은 잠겨서 제외)
      monthlyPassiveIncome:
        (holdingsCapital(holdingRealized) + realizedThisYear) / 12,
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

/** 목표값과 도달 연차로 판정. 목표 미설정(0 이하)은 미도달이 아니다. */
function reachStatus(goal: number, reachYear: number | null): GoalReachStatus {
  if (goal <= 0) return "unset";
  return reachYear != null ? "reached" : "not_reached";
}

/** 루트(수입 바로 아래) 비율 합계 — 100% 검증용 */
export function ratioSum(buckets: Bucket[]): number {
  return rootRatioSum(buckets);
}

/**
 * 수익률 가정 민감도.
 * 투자·저축 버킷의 기대 수익률에 ±delta(%p)를 적용해 '보수/기본/공격' 시나리오를 만든다.
 * 목적: 단일 수익률로 생기는 '거짓 확신'을 방지하고 결과의 폭(밴드)을 정직하게 보여준다.
 */
export type SensitivityKey = "conservative" | "base" | "aggressive";

export const SENSITIVITY: Record<SensitivityKey, { label: string; deltaPp: number }> = {
  conservative: { label: "보수", deltaPp: -3 },
  base: { label: "기본", deltaPp: 0 },
  aggressive: { label: "공격", deltaPp: 3 },
};

/** 투자/저축 버킷의 기대 수익률을 deltaPp 만큼 조정 (0% 하한, 실현≤기대). */
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

/**
 * ETA·달성률 넛지 판단 (§A 극단값).
 * 목표를 아직 정하지 않은 상태(`unset`)는 실패가 아니므로 넛지를 띄우지 않는다.
 */
export function needsRealityNudge(
  status: GoalReachStatus,
  targetReachYear: number | null,
  targetYears: number,
): boolean {
  if (targetYears <= 0) return false;
  if (status === "unset") return false;
  if (targetReachYear === null) return true; // 목표 시점 내 도달 못함
  return targetReachYear > targetYears * 1.5;
}
