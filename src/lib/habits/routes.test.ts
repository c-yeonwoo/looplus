import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(href);
  },
}));
import TrackingPage from "../../app/(app)/tracking/page";

describe("이전 루틴 링크 호환", () => {
  it("주간 점검 초안은 목표와 함께 기존 관리로 보낸다", async () => {
    await expect(
      TrackingPage({
        searchParams: Promise.resolve({ review: "2026-10-19", loop: "goal-1" }),
      }),
    ).rejects.toThrow(
      "/tools/routines?review=2026-10-19&loop=goal-1#legacy-routines",
    );
  });
  it("일상 목표에서 진입한 실행 목록은 오늘로 연결한다", async () => {
    await expect(
      TrackingPage({ searchParams: Promise.resolve({ loop: "goal-1" }) }),
    ).rejects.toThrow("/home?loop=goal-1");
  });
  it("기존 기본 링크도 유효하다", async () => {
    await expect(
      TrackingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("/home");
  });
});
