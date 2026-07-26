import type { Bucket, FinancialSnapshot, HoldingReturns } from "../types";
import { childrenOf, isLeaf } from "./tree";

/**
 * 보유 자산 = 각 투자·저축 버킷의 currentBalance.
 *
 * 진단 스냅샷(cash/investAssets/realEstate)은 온보딩·홈용 총액이고,
 * 엔진에서는 버킷에 나눠 넣은 금액이 정본이다. 버킷 합보다 스냅샷이 크면
 * 그 차액만 '미배분 잔여'로 따로 굴린다 (마이그레이션·부분 입력 대비).
 */

export const DEFAULT_HOLDING_RETURNS: HoldingReturns = {
  cash: { expectedAnnualReturnPct: 2, realizedYieldPct: 0 },
  invest: { expectedAnnualReturnPct: 6, realizedYieldPct: 1.5 },
  realEstate: { expectedAnnualReturnPct: 5, realizedYieldPct: 3 },
};

export function resolveHoldingReturns(
  raw: Partial<HoldingReturns> | undefined,
): HoldingReturns {
  const n = (r: { expectedAnnualReturnPct?: number; realizedYieldPct?: number } | undefined, fb: { expectedAnnualReturnPct: number; realizedYieldPct: number }) => {
    const expected = clampPct(r?.expectedAnnualReturnPct ?? fb.expectedAnnualReturnPct);
    const realized = clampPct(r?.realizedYieldPct ?? fb.realizedYieldPct);
    return { expectedAnnualReturnPct: expected, realizedYieldPct: Math.min(realized, expected) };
  };
  return {
    cash: n(raw?.cash, DEFAULT_HOLDING_RETURNS.cash),
    invest: n(raw?.invest, DEFAULT_HOLDING_RETURNS.invest),
    realEstate: n(raw?.realEstate, DEFAULT_HOLDING_RETURNS.realEstate),
  };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function bucketBalance(b: Bucket): number {
  return Math.max(0, b.currentBalance ?? 0);
}

/** 돈이 쌓이는 리프 (투자·저축). 지출은 잔액 없음 */
export function assetLeaves(all: Bucket[]): Bucket[] {
  return all.filter((b) => isLeaf(b, all) && (b.category === "invest" || b.category === "save"));
}

export function subtreeBalance(bucket: Bucket, all: Bucket[]): number {
  if (bucket.category === "spend") return 0;
  if (isLeaf(bucket, all)) return bucketBalance(bucket);
  return childrenOf(bucket.id, all).reduce((s, c) => s + subtreeBalance(c, all), 0);
}

export function totalBucketBalances(all: Bucket[]): number {
  return assetLeaves(all).reduce((s, b) => s + bucketBalance(b), 0);
}

export function sumBalancesByCategory(all: Bucket[], category: "invest" | "save"): number {
  return assetLeaves(all)
    .filter((b) => b.category === category)
    .reduce((s, b) => s + bucketBalance(b), 0);
}

/**
 * 투자 버킷(잠금 제외)의 실현 수익 → 월 현금흐름(연 환산 전).
 * 저축 이자는 계좌에 남고, 연금 실현은 잠겨서 제외.
 */
export function bucketsRealizedAnnual(all: Bucket[]): number {
  return assetLeaves(all).reduce((sum, b) => {
    if (b.category !== "invest" || b.isLocked) return sum;
    const rate = Math.min(b.realizedYieldPct, b.expectedAnnualReturnPct) / 100;
    return sum + bucketBalance(b) * rate;
  }, 0);
}

/** 스냅샷 총액 − 버킷에 이미 넣은 금액. 음수면 0 */
export function residualHoldings(snapshot: FinancialSnapshot, all: Bucket[]) {
  const saveSum = sumBalancesByCategory(all, "save");
  const investSum = sumBalancesByCategory(all, "invest");
  return {
    cash: Math.max(0, (snapshot.cash || 0) - saveSum),
    invest: Math.max(0, (snapshot.investAssets || 0) + (snapshot.realEstate || 0) - investSum),
  };
}

export function residualTotal(snapshot: FinancialSnapshot, all: Bucket[]): number {
  const r = residualHoldings(snapshot, all);
  return r.cash + r.invest;
}

/** 홈·진단 총액이 버킷 합과 맞게 — 부동산은 투자 합에 포함 */
export function snapshotAssetsFromBuckets(
  snapshot: FinancialSnapshot,
  all: Bucket[],
): Pick<FinancialSnapshot, "cash" | "investAssets" | "realEstate"> {
  return {
    cash: sumBalancesByCategory(all, "save"),
    investAssets: sumBalancesByCategory(all, "invest"),
    // 부동산은 투자 버킷으로 관리. 진단의 realEstate 칸은 0으로 맞춘다.
    realEstate: 0,
  };
}

/**
 * 진단 총액을 같은 카테고리 리프에 비율(수입 대비 %)로 나눠 넣는다.
 * 추천 배분·'진단 금액으로 채우기'에서 사용.
 */
export function seedBalancesFromSnapshot(
  buckets: Bucket[],
  snapshot: FinancialSnapshot,
): Bucket[] {
  const leaves = assetLeaves(buckets);
  const investLeaves = leaves.filter((b) => b.category === "invest");
  const saveLeaves = leaves.filter((b) => b.category === "save");
  const investPool = Math.max(0, (snapshot.investAssets || 0) + (snapshot.realEstate || 0));
  const savePool = Math.max(0, snapshot.cash || 0);

  const distribute = (targets: Bucket[], pool: number): Map<string, number> => {
    const map = new Map<string, number>();
    if (targets.length === 0 || pool <= 0) return map;
    // 흐름 비율이 모두 0이면 균등
    const weights = targets.map((b) => {
      // seed 시점의 ratioPct는 아직 상위 대비일 수 있어, 형제 균등보다
      // 리프 간 상대 비중으로 ratioPct 를 쓴다 (같은 부모면 의미 있음)
      return Math.max(0, b.ratioPct);
    });
    const wSum = weights.reduce((a, b) => a + b, 0);
    let allocated = 0;
    targets.forEach((b, i) => {
      const share = wSum > 0 ? weights[i]! / wSum : 1 / targets.length;
      const amt = i === targets.length - 1 ? pool - allocated : Math.round(pool * share);
      allocated += amt;
      map.set(b.id, Math.max(0, amt));
    });
    return map;
  };

  const investMap = distribute(investLeaves, investPool);
  const saveMap = distribute(saveLeaves, savePool);

  return buckets.map((b) => {
    if (investMap.has(b.id)) return { ...b, currentBalance: investMap.get(b.id)! };
    if (saveMap.has(b.id)) return { ...b, currentBalance: saveMap.get(b.id)! };
    if (b.category === "spend") return { ...b, currentBalance: undefined };
    return b;
  });
}
