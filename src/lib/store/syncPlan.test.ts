import { describe, expect, it } from "vitest";
import { DEFAULT_SNAPSHOT, emptyProfile } from "./defaults";
import type { LoadedProfile } from "./mergeProfile";
import { planInitialSync } from "./syncPlan";
import { draftFromTemplate, routineFromDraft } from "../habits";
import { HABIT_TEMPLATES } from "../habits/catalog";

const remote = (): LoadedProfile => ({
  profile: emptyProfile(),
  stored: { spending: true, uiPrefs: true, engineLayout: true },
});
function localWithData() {
  const local = emptyProfile();
  local.snapshot = { ...DEFAULT_SNAPSHOT, cash: 1000 };
  local.scenarios = [
    { id: "local", name: "내 설계", createdAt: "2026-10-23", buckets: [] },
  ];
  local.tracking.routines = [
    routineFromDraft(draftFromTemplate(HABIT_TEMPLATES[0]), 0),
  ];
  return local;
}
describe("첫 로그인 동기화 분기", () => {
  it("가입 트리거가 만든 빈 계정에는 금융·루틴 전체를 이관한다", () => {
    const local = localWithData();
    const plan = planInitialSync(remote(), local);
    expect(plan.kind).toBe("profile");
    if (plan.kind !== "profile") throw new Error("빈 계정은 충돌이 아님");
    expect(plan.profile).toBe(local);
    expect(plan.profile.snapshot?.cash).toBe(1000);
    expect(plan.profile.scenarios).toHaveLength(1);
    expect(plan.profile.tracking.routines).toHaveLength(1);
  });
  it("원격 행이 없어도 전체 기기 데이터를 보존한다", () => {
    const local = localWithData();
    expect(planInitialSync(null, local)).toEqual({
      kind: "profile",
      profile: local,
    });
  });
  it("이미 데이터가 있는 계정과 기기 루틴이 다를 때만 선택을 받는다", () => {
    const account = remote();
    account.profile.snapshot = { ...DEFAULT_SNAPSHOT, cash: 2000 };
    expect(planInitialSync(account, localWithData()).kind).toBe("choice");
  });
});
