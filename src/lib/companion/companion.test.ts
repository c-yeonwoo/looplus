import { describe, expect, it } from "vitest";
import { emptyTracking, type Tracking } from "../types";
import { draftFromTemplate, recordHabit, routineFromDraft } from "../habits";
import { HABIT_TEMPLATES } from "../habits/catalog";
import { normalizeTracking } from "../tracking";
import { profileHasData, trackingFromDb, trackingToDb } from "../store/supabaseRepo";
import { emptyProfile } from "../store/defaults";
import {
  mergeTrackingByChoice,
  needsHabitMergeChoice,
} from "../store/mergeProfile";
import {
  awardCompanion,
  characterPose,
  companionStage,
  companionStats,
  normalizeCompanion,
} from "./index";

const today = "2026-10-25",
  now = "2026-10-25T10:00:00.000Z";
function fixture(): Tracking {
  const read = routineFromDraft(
    draftFromTemplate(HABIT_TEMPLATES.find((t) => t.id === "read")),
    0,
    new Date("2026-10-01T12:00:00Z"),
  );
  read.id = "read";
  return { ...emptyTracking(), routines: [read] };
}
function record(t: Tracking, date: string, value: number) {
  return recordHabit(t, "read", date, value, today);
}

describe("생활 친구 성장 원장", () => {
  it("성장 원장만 남은 계정도 빈 계정으로 덮어쓰지 않는다", () => {
    const profile = emptyProfile();
    profile.tracking.companion = { characterId: "roo", rewards: [{ id: "first-step", earnedAt: now }] };
    expect(profileHasData(profile)).toBe(true);
  });
  it("생성만으로 성장하지 않으며 첫 양수 기록은 한 번만 지급한다", () => {
    const t = fixture();
    expect(awardCompanion(t, today, now).granted).toEqual([]);
    const first = awardCompanion(record(t, today, 2), today, now);
    expect(first.granted.map((r) => r.id)).toEqual(["first-step"]);
    expect(
      awardCompanion(record(first.tracking, today, 10), today, now).granted,
    ).toEqual([]);
    expect(companionStats(first.tracking, today)).toEqual({
      practiceDays: 1,
      readingDays: 1,
      readingMinutes: 2,
    });
  });
  it("비연속 4일이 첫 책이며 같은 날 중복 루틴·큰 양은 일수를 늘리지 않는다", () => {
    let t = fixture();
    for (const date of ["2026-10-01", "2026-10-06", "2026-10-20"])
      t = record(t, date, 2);
    t.routines.push({ ...t.routines[0], id: "read-duplicate" });
    t = recordHabit(t, "read-duplicate", "2026-10-20", 100, today);
    expect(
      awardCompanion(t, today, now).granted.map((r) => r.id),
    ).not.toContain("first-book");
    const result = awardCompanion(record(t, today, 1), today, now);
    expect(result.granted.map((r) => r.id)).toContain("first-book");
    expect(companionStage(result.tracking.companion)).toBe("first-book");
  });
  it("수정·취소·재기록은 소품을 회수/중복 지급하지 않고 실제량만 바꾼다", () => {
    let t = fixture();
    for (const date of ["2026-10-01", "2026-10-06", "2026-10-20", today])
      t = record(t, date, 2);
    t = awardCompanion(t, today, now).tracking;
    t = record(t, today, 0);
    expect(companionStats(t, today).readingMinutes).toBe(6);
    expect(companionStage(t.companion)).toBe("first-book");
    expect(awardCompanion(record(t, today, 10), today, now).granted).toEqual(
      [],
    );
  });
  it("체크형 옛 독서는 분으로 추정하지 않고 미래 기록도 제외한다", () => {
    const t = fixture();
    t.logs = [
      { date: "2026-10-20", done: { read: true } },
      {
        date: "2026-10-26",
        done: { read: true },
        values: { read: { value: 99, kind: "time", unit: "분", target: 10 } },
      },
    ];
    expect(companionStats(t, today)).toEqual({
      practiceDays: 1,
      readingDays: 1,
      readingMinutes: 0,
    });
  });
  it("보관 후에도 성장과 실제 기록이 유지된다", () => {
    let t = awardCompanion(record(fixture(), today, 2), today, now).tracking;
    t = {
      ...t,
      routines: t.routines.map((r) => ({ ...r, archivedAt: today })),
    };
    expect(companionStats(t, today).readingMinutes).toBe(2);
    expect(companionStage(t.companion)).toBe("together");
  });
  it("기존 자료 정규화와 DB 왕복에 보상을 잃지 않는다", () => {
    expect(normalizeTracking(fixture()).companion).toBeUndefined();
    const t = awardCompanion(record(fixture(), today, 2), today, now).tracking;
    expect(
      trackingFromDb(JSON.parse(JSON.stringify(trackingToDb(t))), []).companion,
    ).toEqual(t.companion);
  });
  it("명시적 병합은 보상을 합집합으로 합치고 같은 ID는 최초 획득을 보존한다", () => {
    const local = awardCompanion(
      record(fixture(), today, 2),
      today,
      now,
    ).tracking;
    const remote = {
      ...local,
      companion: {
        characterId: "roo",
        rewards: [
          { id: "first-step", earnedAt: "2026-10-20T10:00:00Z" },
          { id: "first-book", earnedAt: now },
        ],
      },
    };
    expect(needsHabitMergeChoice(remote, local)).toBe(true);
    const merged = mergeTrackingByChoice(remote, local);
    expect(merged.companion?.rewards).toHaveLength(2);
    expect(
      merged.companion?.rewards.find((r) => r.id === "first-step")?.earnedAt,
    ).toBe("2026-10-20T10:00:00Z");
    expect(needsHabitMergeChoice(merged, merged)).toBe(false);
  });
  it("미래 캐릭터·보상 ID는 보존하되 자산 누락은 기본 포즈로 폴백한다", () => {
    const state = normalizeCompanion({
      characterId: "future-line",
      rewards: [
        { id: "future-stage", earnedAt: now },
        { id: "bad", earnedAt: "invalid" },
      ],
    });
    expect(state.characterId).toBe("future-line");
    expect(state.rewards).toHaveLength(1);
    expect(characterPose(state.characterId, "hello", "exercise").column).toBe(
      0,
    );
    expect(characterPose("roo", "first-book", "reading").column).toBe(1);
  });
});
