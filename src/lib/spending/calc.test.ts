import { describe, expect, it } from "vitest";
import {
  budgetPace,
  categoryBreakdown,
  partitionFixedByBilling,
  sumLogs,
} from "./calc";
import type { FixedExpense, VariableLog } from "./types";

const sample: VariableLog[] = [
  {
    id: "1",
    amountWon: 10000,
    category: "food",
    date: "2026-07-01",
    memo: "",
    createdAt: "",
  },
  {
    id: "2",
    amountWon: 30000,
    category: "food",
    date: "2026-07-02",
    memo: "",
    createdAt: "",
  },
  {
    id: "3",
    amountWon: 10000,
    category: "cafe",
    date: "2026-07-02",
    memo: "",
    createdAt: "",
  },
];

describe("spending calc", () => {
  it("sums logs", () => {
    expect(sumLogs(sample)).toBe(50000);
  });

  it("breaks down by category", () => {
    const b = categoryBreakdown(sample);
    expect(b[0].category).toBe("food");
    expect(b[0].pct).toBe(80);
  });

  it("computes budget pace", () => {
    const p = budgetPace({
      spentWon: 400_000,
      budgetWon: 800_000,
      year: 2026,
      monthIndex: 6,
      today: new Date(2026, 6, 16),
    });
    expect(p.usedPct).toBe(50);
    expect(p.daysLeft).toBe(16); // Jul 16..31
    expect(p.remainingWon).toBe(400_000);
  });

  it("partitions fixed by billing day vs today", () => {
    const fixed: FixedExpense[] = [
      {
        id: "a",
        name: "월세",
        category: "housing",
        amountWon: 700_000,
        billingDay: 1,
      },
      {
        id: "b",
        name: "통신",
        category: "telecom",
        amountWon: 50_000,
        billingDay: 25,
      },
      {
        id: "c",
        name: "구독",
        category: "subscription",
        amountWon: 15_000,
        billingDay: 19,
      },
    ];
    const p = partitionFixedByBilling(fixed, new Date(2026, 6, 19));
    expect(p.paid.map((f) => f.id)).toEqual(["a", "c"]);
    expect(p.upcoming.map((f) => f.id)).toEqual(["b"]);
    expect(p.paidWon).toBe(715_000);
    expect(p.upcomingWon).toBe(50_000);
  });
});
