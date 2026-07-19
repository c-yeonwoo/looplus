import type { SpendingState } from "./types";
import { logsInMonth, sumFixed, sumLogs } from "./calc";

/**
 * 지출(원) ↔ 엔진/진단(만원) 단위 브리지.
 * 엔진 `snapshot.monthlySpending`, 배분 노드 `g_spend` 제안값에 사용.
 */

export function wonToManwon(won: number): number {
  return Math.floor(won / 10_000);
}

/** Phase A / 엔진 sync용 — 당월 변동 + 고정 전체(결제일 무관) */
export function monthSpendingBreakdown(
  spending: SpendingState,
  year: number,
  monthIndex: number,
): {
  variableWon: number;
  fixedWon: number;
  totalWon: number;
  manwon: number;
} {
  const variableWon = sumLogs(logsInMonth(spending.logs, year, monthIndex));
  const fixedWon = sumFixed(spending.fixed);
  const totalWon = variableWon + fixedWon;
  return {
    variableWon,
    fixedWon,
    totalWon,
    manwon: wonToManwon(totalWon),
  };
}

/** 해당 월 변동합 + 고정합 → 엔진 monthlySpending(만원, 버림) */
export function monthTotalSpendingManwon(
  spending: SpendingState,
  year: number,
  monthIndex: number,
): number {
  return monthSpendingBreakdown(spending, year, monthIndex).manwon;
}

/**
 * 소득(만원) 대비 지출 비중 → 엔진 배분 ratio 제안(0–1).
 * 고정/변동 자식 비중도 같이 돌려준다.
 */
export function spendRatioSuggestion(
  spending: SpendingState,
  year: number,
  monthIndex: number,
  monthlyIncomeManwon: number,
): {
  totalRatio: number;
  fixedRatioOfSpend: number;
  variableRatioOfSpend: number;
  monthlySpendingManwon: number;
} | null {
  if (monthlyIncomeManwon <= 0) return null;
  const variableWon = sumLogs(logsInMonth(spending.logs, year, monthIndex));
  const fixedWon = sumFixed(spending.fixed);
  const totalWon = variableWon + fixedWon;
  const monthlySpendingManwon = wonToManwon(totalWon);
  const totalRatio = Math.min(0.95, monthlySpendingManwon / monthlyIncomeManwon);
  const spend = totalWon > 0 ? totalWon : 1;
  return {
    totalRatio,
    fixedRatioOfSpend: fixedWon / spend,
    variableRatioOfSpend: variableWon / spend,
    monthlySpendingManwon,
  };
}
