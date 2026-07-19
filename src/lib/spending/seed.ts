import { DEFAULT_FAVORITES } from "./catalog";
import { toDateKey } from "./format";
import type { FixedExpense, SpendingState, VariableLog } from "./types";

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 데모용 시드 — 현재 달 기준으로 상대 날짜 */
export function seedSpending(): SpendingState {
  const logs: VariableLog[] = [
    {
      id: "l1",
      amountWon: 10000,
      category: "food",
      date: dayOffset(0),
      memo: "점심",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l2",
      amountWon: 4500,
      category: "cafe",
      date: dayOffset(0),
      memo: "아메리카노",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l3",
      amountWon: 42000,
      category: "transport",
      date: dayOffset(-1),
      memo: "카카오택시",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l4",
      amountWon: 28000,
      category: "food",
      date: dayOffset(-1),
      memo: "저녁 배달",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l5",
      amountWon: 15000,
      category: "shopping",
      date: dayOffset(-3),
      memo: "생활용품",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l6",
      amountWon: 9000,
      category: "food",
      date: dayOffset(-5),
      memo: "점심",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l7",
      amountWon: 55000,
      category: "food",
      date: dayOffset(-6),
      memo: "주말 외식",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l8",
      amountWon: 12000,
      category: "living",
      date: dayOffset(-8),
      memo: "편의점",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l9",
      amountWon: 22000,
      category: "cafe",
      date: dayOffset(-10),
      memo: "카페·디저트",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l10",
      amountWon: 35000,
      category: "transport",
      date: dayOffset(-12),
      memo: "주유",
      createdAt: new Date().toISOString(),
    },
  ];

  // 이번 달만 남기기
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLogs = logs.filter((l) => l.date.startsWith(prefix));

  // 합이 ~62만에 가깝도록 보충
  let sum = monthLogs.reduce((s, l) => s + l.amountWon, 0);
  if (sum < 500_000) {
    monthLogs.push({
      id: "l_pad",
      amountWon: 520_000 - sum,
      category: "food",
      date: dayOffset(-2),
      memo: "식비 묶음(시드)",
      createdAt: new Date().toISOString(),
    });
    sum = 520_000;
  }

  const fixed: FixedExpense[] = [
    {
      id: "f1",
      name: "월세",
      category: "housing",
      amountWon: 550_000,
      billingDay: 1,
    },
    {
      id: "f2",
      name: "통신비",
      category: "telecom",
      amountWon: 55_000,
      billingDay: 15,
    },
    {
      id: "f3",
      name: "넷플릭스",
      category: "subscription",
      amountWon: 17_000,
      billingDay: 20,
    },
    {
      id: "f4",
      name: "실손보험",
      category: "insurance",
      amountWon: 45_000,
      billingDay: 10,
    },
  ];

  return {
    monthlyVariableBudgetWon: 800_000,
    logs: monthLogs,
    fixed,
    favorites: DEFAULT_FAVORITES,
  };
}
