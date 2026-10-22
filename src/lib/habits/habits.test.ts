import { describe, expect, it } from "vitest";
import { emptyTracking, type RoutineItem } from "../types";
import {
  draftFromTemplate,
  entryFor,
  entryLabel,
  isHabitDue,
  nextHabitDate,
  recordHabit,
  routineFromDraft,
  validateHabitDraft,
  weeklyProgress,
} from "./index";
import {
  FEATURED_HABIT_IDS,
  HABIT_CATEGORIES,
  HABIT_TEMPLATES,
  searchTemplates,
} from "./catalog";
import { trackingFromDb, trackingToDb } from "../store/supabaseRepo";
import {
  mergeTrackingByChoice,
  needsHabitMergeChoice,
} from "../store/mergeProfile";

const reading = () =>
  routineFromDraft(
    draftFromTemplate(HABIT_TEMPLATES.find((t) => t.id === "read")),
    0,
    new Date(2026, 9, 23, 12),
  );
describe("대표 루틴과 설정", () => {
  it("6개 분야 × 4개, 추천 6개이며 검색은 제목·분야·동의어를 지원한다", () => {
    expect(HABIT_TEMPLATES).toHaveLength(24);
    expect(new Set(HABIT_TEMPLATES.map((t) => t.id)).size).toBe(24);
    HABIT_CATEGORIES.forEach((category) =>
      expect(
        HABIT_TEMPLATES.filter((t) => t.category === category),
      ).toHaveLength(4),
    );
    expect(FEATURED_HABIT_IDS).toHaveLength(6);
    expect(searchTemplates(" 독서 ").map((t) => t.id)).toEqual(["read"]);
    expect(searchTemplates("없는 루틴")).toEqual([]);
  });
  it("모든 시작값이 유효하고 생성은 완료를 만들지 않는다", () => {
    HABIT_TEMPLATES.forEach((template) =>
      expect(validateHabitDraft(draftFromTemplate(template))).toBeNull(),
    );
    expect(reading().habit).toMatchObject({
      kind: "time",
      target: 10,
      minimum: 2,
      unit: "분",
      startDate: "2026-10-23",
    });
    expect(entryFor(reading())).toBeUndefined();
  });
  it.each(["", "0", "-1", "Infinity", "abc", "100001"])(
    "기준 %s 입력을 거절한다",
    (target) => {
      const draft = draftFromTemplate(
        HABIT_TEMPLATES.find((t) => t.id === "read"),
      );
      expect(validateHabitDraft({ ...draft, target })).not.toBeNull();
    },
  );
  it("최소 기준·요일·주 N일을 검증한다", () => {
    const d = draftFromTemplate(HABIT_TEMPLATES[0]);
    expect(validateHabitDraft({ ...d, minimum: d.target })).not.toBeNull();
    expect(
      validateHabitDraft({ ...d, repeat: "weekdays", weekdays: [] }),
    ).not.toBeNull();
    expect(
      validateHabitDraft({ ...d, repeat: "weekly", weeklyTarget: "3.5" }),
    ).not.toBeNull();
    expect(
      validateHabitDraft({ ...d, repeat: "weekly", weeklyTarget: "8" }),
    ).not.toBeNull();
  });
  it("주말에 시작하면 첫 주만 남은 날만큼 줄이고 다음 주는 원래 목표를 쓴다", () => {
    const draft = {
      ...draftFromTemplate(HABIT_TEMPLATES[1]),
      weeklyTarget: "3",
    };
    const r = routineFromDraft(draft, 0, new Date(2026, 9, 25, 12));
    expect(weeklyProgress(r, [], "2026-10-25").target).toBe(1);
    expect(weeklyProgress(r, [], "2026-10-26").target).toBe(3);
  });
  it("요일 선택은 오늘이 아닐 수 있다", () => {
    const r = routineFromDraft(
      {
        ...draftFromTemplate(HABIT_TEMPLATES[0]),
        repeat: "weekdays",
        weekdays: [1],
      },
      0,
      new Date(2026, 9, 23, 12),
    );
    expect(isHabitDue(r, "2026-10-23")).toBe(false);
    expect(nextHabitDate(r, "2026-10-23")).toBe("2026-10-26");
  });
});

describe("실제 실천 기록", () => {
  it("2분은 작게 실천, 10분은 기준 채움이며 재입력은 더하지 않고 대체한다", () => {
    const r = reading();
    let t = { ...emptyTracking(), routines: [r] };
    t = recordHabit(t, r.id, "2026-10-23", 2, "2026-10-23");
    expect(entryLabel(entryFor(r, t.logs[0]))).toBe("2분 · 작게 실천");
    expect(t.logs[0].done[r.id]).toBe(false);
    expect(weeklyProgress(r, t.logs, "2026-10-23").done).toBe(1);
    t = recordHabit(t, r.id, "2026-10-23", 5, "2026-10-23");
    expect(entryFor(r, t.logs[0])?.value).toBe(5);
    t = recordHabit(t, r.id, "2026-10-23", 10, "2026-10-23");
    expect(t.logs[0].done[r.id]).toBe(true);
    t = recordHabit(t, r.id, "2026-10-23", 0, "2026-10-23");
    expect(entryFor(r, t.logs[0])).toBeUndefined();
  });
  it("미래·생성 전·존재하지 않는 날짜는 기록하지 않는다", () => {
    const r = reading(),
      t = { ...emptyTracking(), routines: [r] };
    ["2026-10-24", "2026-10-22", "2026-02-30", "bad"].forEach((date) =>
      expect(() => recordHabit(t, r.id, date, 1, "2026-10-23")).toThrow(),
    );
    [NaN, Infinity, -1, 100001].forEach((n) =>
      expect(() =>
        recordHabit(t, r.id, "2026-10-23", n, "2026-10-23"),
      ).toThrow(),
    );
  });
  it("기존 체크를 분으로 환산하지 않고 보관해도 기록을 유지한다", () => {
    const r = { ...reading(), archivedAt: "2026-10-24" };
    const log = { date: "2026-10-23", done: { [r.id]: true } };
    expect(entryLabel(entryFor(r, log))).toBe("완료");
    expect(isHabitDue(r, "2026-10-23")).toBe(true);
    expect(isHabitDue(r, "2026-10-24")).toBe(false);
  });
  it("체크에는 0 또는 1만 허용하고 다른 루틴 기록은 변경하지 않는다", () => {
    const r: RoutineItem = {
      id: "legacy",
      title: "기존",
      schedule: "daily",
      createdAt: "2026-10-01",
      position: 0,
    };
    const t = {
      ...emptyTracking(),
      routines: [r],
      logs: [{ date: "2026-10-23", done: { other: true } }],
    };
    expect(() => recordHabit(t, r.id, "2026-10-23", 2, "2026-10-23")).toThrow();
    expect(
      recordHabit(t, r.id, "2026-10-23", 1, "2026-10-23").logs[0].done.other,
    ).toBe(true);
  });
  it("Supabase v5 JSON과 왕복해도 설정과 기록량이 유지된다", () => {
    const r = reading();
    const t = recordHabit(
      { ...emptyTracking(), routines: [r] },
      r.id,
      "2026-10-23",
      2,
      "2026-10-23",
    );
    const restored = trackingFromDb(
      JSON.parse(JSON.stringify(trackingToDb(t))),
      [],
    );
    expect(restored.routines).toEqual(t.routines);
    expect(restored.logs).toEqual(t.logs);
    expect(needsHabitMergeChoice(restored, t)).toBe(false);
  });
  it("로그인 충돌은 선택이 필요하고 명시적 합치기는 양쪽 기록과 취소를 존중한다", () => {
    const r = reading(),
      other = { ...reading(), id: "remote" };
    const remote = recordHabit(
      { ...emptyTracking(), routines: [r, other] },
      r.id,
      "2026-10-23",
      10,
      "2026-10-23",
    );
    const local = recordHabit(
      { ...emptyTracking(), routines: [r] },
      r.id,
      "2026-10-23",
      0,
      "2026-10-23",
    );
    expect(needsHabitMergeChoice(remote, local)).toBe(true);
    const merged = mergeTrackingByChoice(remote, local);
    expect(merged.routines).toHaveLength(2);
    expect(entryFor(r, merged.logs[0])).toBeUndefined();
  });
});
