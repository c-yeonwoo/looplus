import { INCOME_SOURCE_META, type IncomeSource, type IncomeSourceType } from "./types";

/**
 * 예전 '수입원으로 연결' 버튼이 만들던 자산 현금흐름 수입원의 고정 id.
 * 지금은 보유 자산의 실현 수익을 프로젝션이 직접 자본소득으로 재유입한다.
 * 이 수입원이 남아 있으면 같은 돈을 두 번 세므로 읽는 시점에 걷어낸다.
 */
const LEGACY_ASSET_CASHFLOW_SOURCE_ID = "inc_asset_cashflow";

let inc = 0;
export function newIncomeId(): string {
  inc += 1;
  return `inc_${inc}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 레거시 소스에 id·position 부여 + 이중계산 수입원 제거 */
export function normalizeIncomeSources(list: IncomeSource[]): IncomeSource[] {
  return list
    .filter((s) => s.id !== LEGACY_ASSET_CASHFLOW_SOURCE_ID)
    .map((s, i) => ({
      ...s,
      id: s.id || `inc_${s.type}_${i}`,
      position: s.position ?? i,
      name: s.name || INCOME_SOURCE_META[s.type].label,
    }));
}

export function incomeSourceLabel(s: IncomeSource): string {
  return s.name?.trim() || INCOME_SOURCE_META[s.type].label;
}

export function sumMonthlyIncome(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => sum + (s.monthly || 0), 0);
}

export function createIncomeSource(
  type: IncomeSourceType,
  position: number,
  monthly: number,
  name?: string,
): IncomeSource {
  return {
    id: newIncomeId(),
    type,
    monthly: Math.max(0, monthly),
    name: name?.trim() || INCOME_SOURCE_META[type].label,
    position,
  };
}

export const INCOME_TYPE_ORDER: IncomeSourceType[] = [
  "labor",
  "capital",
  "platform",
  "freelance",
];

/** 팔레트에 바로 보이는 샘플 프리셋 (나머지는 직접 만들기) */
export const INCOME_PALETTE_PRESETS: IncomeSourceType[] = ["labor"];
