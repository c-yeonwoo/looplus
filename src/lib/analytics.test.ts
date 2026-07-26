import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS } from "./analytics";

describe("analytics event catalog", () => {
  it("includes north-star funnel events", () => {
    for (const e of [
      "onboarding_started",
      "onboarding_completed",
      "aha_engine_allocated",
      "page_viewed",
      "lead_cta_clicked",
      "home_week_delta_viewed",
      "weekly_checkin",
    ] as const) {
      expect(ANALYTICS_EVENTS).toContain(e);
    }
  });

  it("has unique event names", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });

  it("can measure the aha funnel end to end", () => {
    // 분모 → 분자 → 이탈 지점. 하나라도 빠지면 아하 도달률을 계산할 수 없다.
    for (const e of [
      "onboarding_completed",
      "engine_result_viewed",
      "income_gate_blocked",
      "goal_guard_shown",
    ] as const) {
      expect(ANALYTICS_EVENTS).toContain(e);
    }
  });
});
