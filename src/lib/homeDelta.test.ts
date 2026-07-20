import { describe, expect, it, beforeEach } from "vitest";
import { computeWeekDelta, weekKey } from "./homeDelta";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  });
});

describe("homeDelta", () => {
  it("첫 방문(또는 새 주)에는 앵커를 저장하고 isNewWeek", () => {
    const d = computeWeekDelta({
      netWorth: 3000,
      achievementPct: 3,
      stage: 4,
      now: new Date("2026-07-20T12:00:00"),
    });
    expect(d.isNewWeek).toBe(true);
    expect(d.netWorthDelta).toBe(0);
    expect(weekKey(new Date("2026-07-20T12:00:00"))).toBe("2026-07-20");
    expect(weekKey(new Date("2026-07-22T12:00:00"))).toBe("2026-07-20");
  });

  it("같은 주 재방문 시 주초 대비 델타", () => {
    const now = new Date("2026-07-20T12:00:00");
    computeWeekDelta({
      netWorth: 3000,
      achievementPct: 3,
      stage: 4,
      now,
    });
    const d = computeWeekDelta({
      netWorth: 3200,
      achievementPct: 3.2,
      stage: 4,
      now: new Date("2026-07-22T12:00:00"),
    });
    expect(d.isNewWeek).toBe(false);
    expect(d.netWorthDelta).toBe(200);
    expect(d.achievementDeltaPp).toBeCloseTo(0.2, 5);
  });
});
