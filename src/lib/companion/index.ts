import type { Tracking } from "../types";

export interface CompanionReward {
  id: string;
  earnedAt: string;
}
export interface CompanionState {
  characterId: string;
  rewards: CompanionReward[];
}
export type CompanionActivity = "idle" | "reading" | "exercise" | "celebrate";
export type CompanionStage = "hello" | "together" | "first-book";

export interface CharacterPose {
  src: string;
  column: number;
  columns: number;
  label: string;
}
export interface CharacterLine {
  id: string;
  name: string;
  stages: Record<
    CompanionStage,
    Partial<Record<CompanionActivity, CharacterPose>>
  >;
}
const idle: CharacterPose = {
  src: "/characters/roo/poses-v1.png",
  column: 0,
  columns: 3,
  label: "손을 흔드는 루",
};
const reading: CharacterPose = { ...idle, column: 1, label: "책을 읽는 루" };
const celebrate: CharacterPose = {
  ...idle,
  column: 2,
  label: "첫 책을 들고 기뻐하는 루",
};

export const CHARACTER_LINES: readonly CharacterLine[] = [
  {
    id: "roo",
    name: "루",
    stages: {
      hello: { idle },
      together: { idle },
      "first-book": { idle: reading, reading, celebrate },
    },
  },
];

export function characterLine(id?: string): CharacterLine {
  return CHARACTER_LINES.find((line) => line.id === id) ?? CHARACTER_LINES[0];
}
export function characterPose(
  id: string | undefined,
  stage: CompanionStage,
  activity: CompanionActivity,
): CharacterPose {
  const line = characterLine(id);
  return (
    line.stages[stage][activity] ??
    line.stages[stage].idle ??
    line.stages.hello.idle!
  );
}

/** Unknown IDs survive old clients; only known assets/rewards are rendered. */
export function normalizeCompanion(
  raw?: Partial<CompanionState> | null,
): CompanionState {
  const rewards = new Map<string, CompanionReward>();
  for (const r of Array.isArray(raw?.rewards) ? raw.rewards : []) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id ||
      r.id.length > 120 ||
      typeof r.earnedAt !== "string" ||
      !Number.isFinite(Date.parse(r.earnedAt))
    )
      continue;
    const previous = rewards.get(r.id);
    if (!previous || Date.parse(r.earnedAt) < Date.parse(previous.earnedAt))
      rewards.set(r.id, { id: r.id, earnedAt: r.earnedAt });
  }
  return {
    characterId:
      typeof raw?.characterId === "string" && raw.characterId
        ? raw.characterId
        : "roo",
    rewards: [...rewards.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
export function mergeCompanion(
  remote?: CompanionState,
  local?: CompanionState,
): CompanionState {
  return normalizeCompanion({
    characterId: local?.characterId ?? remote?.characterId,
    rewards: [...(remote?.rewards ?? []), ...(local?.rewards ?? [])],
  });
}
export function companionStage(state?: CompanionState): CompanionStage {
  return state?.rewards.some((r) => r.id === "first-book")
    ? "first-book"
    : state?.rewards.some((r) => r.id === "first-step")
      ? "together"
      : "hello";
}
export function companionStats(tracking: Tracking, today: string) {
  const practiceDays = new Set<string>(),
    readingDays = new Set<string>();
  let readingMinutes = 0;
  const routines = new Map(tracking.routines.map((r) => [r.id, r]));
  for (const log of tracking.logs) {
    if (log.date > today || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) continue;
    for (const id of new Set([
      ...Object.keys(log.done),
      ...Object.keys(log.values ?? {}),
    ])) {
      const routine = routines.get(id),
        entry = log.values?.[id];
      const positive = entry
        ? Number.isFinite(entry.value) && entry.value > 0
        : log.done[id] === true;
      if (!routine || !positive) continue;
      practiceDays.add(log.date);
      if (routine.habit?.templateId === "read") {
        readingDays.add(log.date);
        if (entry?.kind === "time" && entry.unit === "분")
          readingMinutes += entry.value;
      }
    }
  }
  return {
    practiceDays: practiceDays.size,
    readingDays: readingDays.size,
    readingMinutes,
  };
}

/** Award IDs are stable, append-only milestones, not repeatable XP. */
export function awardCompanion(
  tracking: Tracking,
  today: string,
  now = new Date().toISOString(),
) {
  const companion = normalizeCompanion(tracking.companion);
  const stats = companionStats(tracking, today);
  const eligible = [
    stats.practiceDays > 0 && "first-step",
    stats.readingDays >= 4 && "first-book",
  ].filter((id): id is string => Boolean(id));
  const granted = eligible
    .filter((id) => !companion.rewards.some((r) => r.id === id))
    .map((id) => ({ id, earnedAt: now }));
  return {
    tracking: {
      ...tracking,
      companion: normalizeCompanion({
        ...companion,
        rewards: [...companion.rewards, ...granted],
      }),
    },
    granted,
  };
}
