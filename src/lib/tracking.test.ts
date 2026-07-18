import { describe, it, expect } from "vitest";
import { computeStreak, hasCheckedInThisWeek, weekIndex } from "./tracking";

describe("tracking streak", () => {
  const now = new Date("2026-07-15T10:00:00"); // 수요일
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

  it("점검이 없으면 스트릭 0", () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it("이번 주 점검 시 스트릭 1", () => {
    expect(computeStreak([daysAgo(0)], now)).toBe(1);
    expect(hasCheckedInThisWeek([daysAgo(0)], now)).toBe(true);
  });

  it("연속 3주 점검 시 스트릭 3", () => {
    expect(computeStreak([daysAgo(0), daysAgo(7), daysAgo(14)], now)).toBe(3);
  });

  it("한 주 건너뛰면 스트릭 끊김", () => {
    // 이번 주 + 2주 전 (지난 주 없음) → 1
    expect(computeStreak([daysAgo(0), daysAgo(14)], now)).toBe(1);
  });

  it("지난 주까지만 점검했으면 이번 주 미점검이어도 스트릭 유지", () => {
    expect(computeStreak([daysAgo(7)], now)).toBe(1);
    expect(hasCheckedInThisWeek([daysAgo(7)], now)).toBe(false);
  });

  it("weekIndex는 같은 주 내에서 동일", () => {
    expect(weekIndex("2026-07-13")).toBe(weekIndex("2026-07-19")); // 월~일
  });
});
