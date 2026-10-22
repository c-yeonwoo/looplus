import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { emptyProfile } from "../store/defaults";
import { draftFromTemplate } from "./index";
import { HABIT_TEMPLATES } from "./catalog";
import { dateKey } from "../tracking";

const memory = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => memory.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    memory.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    memory.delete(key);
  }),
};
vi.stubGlobal("localStorage", storage);
const { useProfile } = await import("../store/useProfile");

beforeEach(() => {
  vi.clearAllMocks();
  storage.setItem.mockImplementation((k, v) => {
    memory.set(k, v);
  });
  memory.clear();
  useProfile.getState().replaceProfile(emptyProfile());
});
afterEach(() => vi.restoreAllMocks());
describe("기기 저장의 성공과 실패", () => {
  it("중복 제출은 같은 루틴 하나, 생성 후 기록은 비어 있다", () => {
    const draft = draftFromTemplate(HABIT_TEMPLATES[0]);
    const id = useProfile.getState().addHabit(draft);
    expect(useProfile.getState().addHabit(draft)).toBe(id);
    expect(useProfile.getState().profile.tracking.routines).toHaveLength(1);
    expect(useProfile.getState().profile.tracking.logs).toEqual([]);
    const stored = JSON.parse(memory.get("looplus-profile-v2")!);
    expect(stored.state.profile.tracking.routines[0].id).toBe(id);
  });
  it("저장 공간 실패 시 생성 성공을 발행하지 않고 재시도할 수 있다", () => {
    const draft = draftFromTemplate(HABIT_TEMPLATES[0]);
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    expect(() => useProfile.getState().addHabit(draft)).toThrow();
    expect(useProfile.getState().profile.tracking.routines).toEqual([]);
    useProfile.getState().addHabit(draft);
    expect(useProfile.getState().profile.tracking.routines).toHaveLength(1);
  });
  it("기록 수정 저장 실패는 이전 기록을 유지한다", () => {
    const id = useProfile
      .getState()
      .addHabit(draftFromTemplate(HABIT_TEMPLATES[0]));
    useProfile.getState().setHabitValue(dateKey(), id, 1);
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    expect(() =>
      useProfile.getState().setHabitValue(dateKey(), id, 2),
    ).toThrow();
    expect(
      useProfile.getState().profile.tracking.logs[0].values?.[id].value,
    ).toBe(1);
  });
  it("없는 목표를 연결하지 않는다", () => {
    expect(() =>
      useProfile.getState().addHabit({
        ...draftFromTemplate(HABIT_TEMPLATES[0]),
        loopId: "missing",
      }),
    ).toThrow();
  });
  it("레거시 토글·요일 편집은 실제 실천량과 주 N일 설정을 바꾸지 않는다", () => {
    const id = useProfile
      .getState()
      .addHabit(draftFromTemplate(HABIT_TEMPLATES[1]));
    useProfile.getState().setHabitValue(dateKey(), id, 2);
    useProfile.getState().toggleRoutineDay(dateKey(), id);
    useProfile.getState().updateRoutine(id, { schedule: { weekdays: [1] } });
    const t = useProfile.getState().profile.tracking;
    expect(t.logs[0].values?.[id].value).toBe(2);
    expect(t.routines[0].schedule).toBe("daily");
    expect(t.routines[0].habit?.weeklyTarget).toBe(3);
  });
  it("보관은 과거 기록량을 삭제하지 않고 실패하면 실행 목록도 유지한다", () => {
    const id = useProfile
      .getState()
      .addHabit(draftFromTemplate(HABIT_TEMPLATES[0]));
    useProfile.getState().setHabitValue(dateKey(), id, 1);
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    expect(() => useProfile.getState().removeRoutine(id)).toThrow();
    expect(
      useProfile.getState().profile.tracking.routines[0].archivedAt,
    ).toBeUndefined();
    useProfile.getState().removeRoutine(id);
    const t = useProfile.getState().profile.tracking;
    expect(t.routines[0].archivedAt).toBe(dateKey());
    expect(t.logs[0].values?.[id].value).toBe(1);
  });
});
