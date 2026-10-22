import type {
  DayLog,
  HabitConfig,
  HabitEntry,
  RoutineItem,
  Tracking,
} from "../types";
import {
  addDays,
  dateKey,
  formatSchedule,
  isRoutineScheduled,
  mondayOf,
  parseDateKey,
} from "../tracking";
import type { HabitTemplate } from "./catalog";

export interface HabitDraft {
  id: string;
  title: string;
  kind: HabitConfig["kind"];
  target: string;
  unit: string;
  minimum: string;
  smallAction: string;
  repeat: "daily" | "weekdays" | "weekly";
  weekdays: number[];
  weeklyTarget: string;
  cue: string;
  loopId: string;
  templateId?: string;
}
export function draftFromTemplate(
  template?: HabitTemplate,
  title = "",
): HabitDraft {
  return {
    id: crypto.randomUUID(),
    title: template?.title ?? title,
    kind: template?.kind ?? "check",
    target: String(template?.target ?? 1),
    unit: template?.unit ?? "",
    minimum: template?.minimum == null ? "" : String(template.minimum),
    smallAction: template?.smallAction ?? "",
    repeat: template?.weeklyTarget ? "weekly" : "daily",
    weekdays: [],
    weeklyTarget: String(template?.weeklyTarget ?? 3),
    cue: "",
    loopId: "",
    templateId: template?.id,
  };
}
export function validateHabitDraft(d: HabitDraft): string | null {
  if (!d.id || !d.title.trim() || d.title.trim().length > 80)
    return "루틴 이름을 1~80자로 입력해 주세요.";
  if (!["check", "time", "count"].includes(d.kind))
    return "기록 방식을 선택해 주세요.";
  if (
    d.kind !== "check" &&
    (!Number.isFinite(Number(d.target)) ||
      Number(d.target) <= 0 ||
      Number(d.target) > 100000)
  )
    return "기준은 0보다 크고 100,000 이하인 숫자로 입력해 주세요.";
  if (d.kind === "count" && (!d.unit.trim() || d.unit.trim().length > 8))
    return "수량의 단위를 1~8자로 입력해 주세요.";
  if (
    d.kind !== "check" &&
    d.minimum &&
    (!Number.isFinite(Number(d.minimum)) ||
      Number(d.minimum) <= 0 ||
      Number(d.minimum) >= Number(d.target))
  )
    return "작게 할 때의 기준은 0보다 크고 한 번의 기준보다 작아야 해요.";
  if (!["daily", "weekdays", "weekly"].includes(d.repeat))
    return "반복 주기를 선택해 주세요.";
  if (
    d.repeat === "weekdays" &&
    (!d.weekdays.length ||
      d.weekdays.some((n) => !Number.isInteger(n) || n < 0 || n > 6))
  )
    return "실천할 요일을 한 개 이상 선택해 주세요.";
  if (
    d.repeat === "weekly" &&
    (!Number.isInteger(Number(d.weeklyTarget)) ||
      Number(d.weeklyTarget) < 1 ||
      Number(d.weeklyTarget) > 7)
  )
    return "한 주에 실천할 날을 1~7일로 입력해 주세요.";
  if (d.cue.length > 120 || d.smallAction.length > 120)
    return "보조 설명은 120자 이내로 입력해 주세요.";
  return null;
}
export function routineFromDraft(
  d: HabitDraft,
  position: number,
  now = new Date(),
): RoutineItem {
  const error = validateHabitDraft(d);
  if (error) throw new Error(error);
  return {
    id: d.id,
    title: d.title.trim(),
    position,
    createdAt: now.toISOString(),
    source: "manual",
    schedule:
      d.repeat === "weekdays"
        ? { weekdays: [...new Set(d.weekdays)] }
        : "daily",
    loopId: d.loopId || undefined,
    habit: {
      kind: d.kind,
      target: d.kind === "check" ? 1 : Number(d.target),
      unit: d.kind === "check" ? "" : d.kind === "time" ? "분" : d.unit.trim(),
      minimum: d.kind !== "check" && d.minimum ? Number(d.minimum) : undefined,
      smallAction:
        d.kind === "check" ? d.smallAction.trim() || undefined : undefined,
      weeklyTarget: d.repeat === "weekly" ? Number(d.weeklyTarget) : undefined,
      startDate: dateKey(now),
      cue: d.cue.trim() || undefined,
      templateId: d.templateId,
      templateVersion: d.templateId ? 1 : undefined,
    },
  };
}
export function habitConfig(r: RoutineItem): HabitConfig {
  return (
    r.habit ?? {
      kind: "check",
      target: 1,
      unit: "",
      startDate: r.createdAt ? dateKey(new Date(r.createdAt)) : "1970-01-01",
    }
  );
}
export function habitScheduleLabel(r: RoutineItem): string {
  return r.habit?.weeklyTarget
    ? `주 ${r.habit.weeklyTarget}일 · 아무 요일에나`
    : formatSchedule(r.schedule);
}
export function habitTargetLabel(r: RoutineItem): string {
  const h = habitConfig(r);
  return h.kind === "check" ? "체크" : `${h.target}${h.unit}`;
}
export function isHabitDue(r: RoutineItem, date: string): boolean {
  const h = habitConfig(r);
  return (
    h.startDate <= date &&
    (!r.archivedAt || date < r.archivedAt) &&
    isRoutineScheduled(r, date)
  );
}
export function entryFor(r: RoutineItem, log?: DayLog): HabitEntry | undefined {
  const saved = log?.values?.[r.id];
  if (saved) return saved;
  // 기존 완료 기록을 새로 만든 시간/수량으로 추정하지 않는다.
  return log?.done[r.id]
    ? { value: 1, kind: "check", target: 1, unit: "" }
    : undefined;
}
export function entryLabel(entry?: HabitEntry): string {
  if (!entry || entry.value <= 0) return "아직 기록하지 않았어요";
  if (entry.kind === "check") return "완료";
  const status =
    entry.value >= entry.target
      ? "기준 채움"
      : entry.minimum && entry.value >= entry.minimum
        ? "작게 실천"
        : "일부 실천";
  return `${entry.value}${entry.unit} · ${status}`;
}
export function weeklyProgress(r: RoutineItem, logs: DayLog[], date: string) {
  const monday = mondayOf(date),
    end = addDays(monday, 6),
    start = habitConfig(r).startDate;
  const available = Array.from({ length: 7 }, (_, i) =>
    addDays(monday, i),
  ).filter((key) => key >= start).length;
  const done = new Set(
    logs
      .filter(
        (log) =>
          log.date >= monday &&
          log.date <= end &&
          (entryFor(r, log)?.value ?? 0) > 0,
      )
      .map((log) => log.date),
  ).size;
  return { done, target: Math.min(r.habit?.weeklyTarget ?? 7, available) };
}
export function nextHabitDate(
  r: RoutineItem,
  from: string,
): string | undefined {
  for (let i = 0; i < 8; i++) {
    const key = addDays(from, i);
    if (isHabitDue(r, key)) return key;
  }
}
export function recordHabit(
  tracking: Tracking,
  id: string,
  date: string,
  value: number,
  today = dateKey(),
): Tracking {
  const r = tracking.routines.find((item) => item.id === id);
  if (
    !r ||
    dateKey(parseDateKey(date)) !== date ||
    date > today ||
    !isHabitDue(r, date)
  )
    throw new Error("기록할 루틴과 날짜를 확인해 주세요.");
  const h = habitConfig(r);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100000 ||
    (h.kind === "check" && value !== 0 && value !== 1)
  )
    throw new Error("올바른 실천량을 입력해 주세요.");
  const previous = tracking.logs.find((log) => log.date === date);
  const values = { ...previous?.values };
  if (value === 0) delete values[id];
  else
    values[id] = {
      value,
      kind: h.kind,
      unit: h.unit,
      target: h.target,
      minimum: h.minimum,
    };
  const log: DayLog = {
    ...previous,
    date,
    done: { ...previous?.done, [id]: value >= h.target },
    values,
  };
  return {
    ...tracking,
    logs: [...tracking.logs.filter((item) => item.date !== date), log].sort(
      (a, b) => a.date.localeCompare(b.date),
    ),
  };
}
