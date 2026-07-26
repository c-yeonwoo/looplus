import type {
  FinancialSnapshot,
  HoldingKind,
  HoldingReturn,
  HoldingReturns,
} from "../types";

/**
 * 보유 자산(이미 가진 돈) 모델.
 *
 * 버킷은 '월수입을 어디로 보낼지'(흐름)만 다룬다. 이미 가진 자산을 그 흐름 비율로
 * 쪼개면 실제 보유 구성과 무관한 숫자가 나오므로(주식에만 있는 돈이 연금에도 있는 것처럼
 * 계산됨), 보유 자산은 종류별로 독립해서 굴린다.
 *
 * 종류별로 수익 성격이 다르다:
 *  - 현금: 이자만, 대부분 계좌에 남음
 *  - 투자자산: 시세 상승(미실현) + 배당(실현)
 *  - 부동산: 시세 상승(미실현) + 임대(실현)
 */

export const HOLDING_KINDS: HoldingKind[] = ["cash", "invest", "realEstate"];

export const HOLDING_META: Record<HoldingKind, { label: string; hint: string }> = {
  cash: { label: "현금·예금", hint: "이자" },
  invest: { label: "투자자산", hint: "배당" },
  realEstate: { label: "부동산", hint: "임대" },
};

/** 모두 '예시·가정'. 자산 노드에서 바꿀 수 있다. */
export const DEFAULT_HOLDING_RETURNS: HoldingReturns = {
  cash: { expectedAnnualReturnPct: 2, realizedYieldPct: 0 },
  invest: { expectedAnnualReturnPct: 6, realizedYieldPct: 1.5 },
  realEstate: { expectedAnnualReturnPct: 5, realizedYieldPct: 3 },
};

function normalizeReturn(raw: Partial<HoldingReturn> | undefined, fallback: HoldingReturn) {
  const expected = clampPct(raw?.expectedAnnualReturnPct ?? fallback.expectedAnnualReturnPct);
  const realized = clampPct(raw?.realizedYieldPct ?? fallback.realizedYieldPct);
  // 현금으로 나오는 몫이 총수익을 넘을 수는 없다.
  return { expectedAnnualReturnPct: expected, realizedYieldPct: Math.min(realized, expected) };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** 저장된 값 + 기본값 → 항상 완전한 가정 집합 */
export function resolveHoldingReturns(
  raw: Partial<HoldingReturns> | undefined,
): HoldingReturns {
  return {
    cash: normalizeReturn(raw?.cash, DEFAULT_HOLDING_RETURNS.cash),
    invest: normalizeReturn(raw?.invest, DEFAULT_HOLDING_RETURNS.invest),
    realEstate: normalizeReturn(raw?.realEstate, DEFAULT_HOLDING_RETURNS.realEstate),
  };
}

export function holdingBalance(snapshot: FinancialSnapshot, kind: HoldingKind): number {
  const raw =
    kind === "cash"
      ? snapshot.cash
      : kind === "invest"
        ? snapshot.investAssets
        : snapshot.realEstate;
  return Math.max(0, raw || 0);
}

export function totalHoldings(snapshot: FinancialSnapshot): number {
  return HOLDING_KINDS.reduce((s, k) => s + holdingBalance(snapshot, k), 0);
}

/** 보유 자산에서 올해 현금으로 나오는 금액 (연, 만원) */
export function holdingsRealizedAnnual(
  snapshot: FinancialSnapshot,
  returns: HoldingReturns,
): number {
  return HOLDING_KINDS.reduce((sum, kind) => {
    const r = returns[kind];
    const rate = Math.min(r.realizedYieldPct, r.expectedAnnualReturnPct) / 100;
    return sum + holdingBalance(snapshot, kind) * rate;
  }, 0);
}
