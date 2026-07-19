import { describe, expect, it } from "vitest";
import { budgetPace, categoryBreakdown, sumLogs } from "./calc";
import type { VariableLog } from "./types";

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
});
