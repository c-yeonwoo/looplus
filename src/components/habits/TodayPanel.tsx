"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/store/useProfile";
import {
  entryFor,
  entryLabel,
  habitConfig,
  habitScheduleLabel,
  habitTargetLabel,
  isHabitDue,
  nextHabitDate,
  weeklyProgress,
} from "@/lib/habits";
import { useToday } from "@/lib/habits/useToday";
import { parseDateKey } from "@/lib/tracking";
import type { RoutineItem } from "@/lib/types";
import { HabitIcon } from "./HabitIcon";
import { HabitRecordDialog } from "./HabitRecordDialog";
import { Icon } from "../Icon";
import { Character } from "../companion/Character";
import { GrowthDialog } from "../companion/GrowthDialog";
import {
  characterLine,
  companionStage,
  companionStats,
  type CompanionReward,
} from "@/lib/companion";

export function TodayPanel({
  added = "",
  loopId = "",
}: {
  added?: string;
  loopId?: string;
}) {
  const profile = useProfile((s) => s.profile);
  const today = useToday();
  const router = useRouter();
  const [record, setRecord] = useState<{
    routine: RoutineItem;
    date: string;
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [growth, setGrowth] = useState<CompanionReward[] | null>(null);
  const tracking = profile.tracking;
  const active = tracking.routines
    .filter((r) => !r.archivedAt)
    .sort((a, b) => a.position - b.position);
  const filterGoal = tracking.goalLoops.find((g) => g.id === loopId);
  const list = filterGoal ? active.filter((r) => r.loopId === loopId) : active;
  const todayLog = tracking.logs.find((l) => l.date === today);
  const due = list.filter((r) => isHabitDue(r, today));
  const focus = due.find((r) => !entryFor(r, todayLog)) ?? due[0];
  const stats = companionStats(tracking, today);
  const practiced = due.filter(
    (r) => (entryFor(r, todayLog)?.value ?? 0) > 0,
  ).length;
  const scheduled = due.filter((r) => !r.habit?.weeklyTarget),
    flexible = due.filter((r) => r.habit?.weeklyTarget);
  const upcoming = list.filter((r) => !isHabitDue(r, today));
  const addedRoutine = active.find((r) => r.id === added);
  const createHref = filterGoal
    ? `/routines/new?goal=${encodeURIComponent(filterGoal.id)}`
    : "/routines/new";
  const rows = (items: RoutineItem[]) => (
    <ul className="habit-list">
      {items.map((r) => {
        const entry = entryFor(r, todayLog),
          goal = tracking.goalLoops.find((g) => g.id === r.loopId),
          weekly = weeklyProgress(r, tracking.logs, today);
        return (
          <li key={r.id} className="habit-routine">
            <span
              className="habit-icon-tile"
              data-tone={
                r.habit?.templateId === "stretch" ||
                r.habit?.templateId === "walk"
                  ? "yellow"
                  : "blue"
              }
            >
              <HabitIcon templateId={r.habit?.templateId} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-ink-600">
                {habitTargetLabel(r)} ·{" "}
                {r.habit?.weeklyTarget
                  ? `이번 주 ${weekly.done} / ${weekly.target}일`
                  : habitScheduleLabel(r)}
              </p>
              {habitConfig(r).cue && (
                <p className="mt-1 text-sm text-ink-600">
                  {habitConfig(r).cue}
                </p>
              )}
              {goal && (
                <Link
                  className="mt-1 block text-sm text-gold-600 underline underline-offset-4"
                  href={`/goals/${encodeURIComponent(goal.id)}`}
                >
                  {goal.title}
                </Link>
              )}
              {entry && (
                <p className="mt-2 text-sm font-medium text-gold-600">
                  {entryLabel(entry)}
                </p>
              )}
            </div>
            <button
              className="habit-round-action shrink-0"
              aria-label={`${r.title} ${entry ? "기록 수정" : "기록"}`}
              onClick={() => setRecord({ routine: r, date: today })}
            >
              <Icon name={entry ? "check" : "plus"} size={20} />
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className="habit-page habit-today">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="habit-title">나의 속도로, 오늘</h1>
          <p className="mt-2 text-ink-600">
            {new Intl.DateTimeFormat("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(parseDateKey(today))}
          </p>
        </div>
      </header>
      <div className="companion-greeting">
        <Character
          characterId={tracking.companion?.characterId}
          stage={companionStage(tracking.companion)}
        />
        <div>
          <p>
            조금만 해도 좋아.
            <br />
            같이 시작해 볼까?
          </p>
          <button className="companion-progress" onClick={() => setGrowth([])}>
            {characterLine(tracking.companion?.characterId).name}와 함께한 {stats.practiceDays}일
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
      {feedback && (
        <p className="habit-notice mt-6" role="status">
          {feedback}
        </p>
      )}
      {addedRoutine && (
        <div className="habit-notice mt-6" role="status">
          <span>{addedRoutine.title} 루틴을 추가했어요.</span>
          <button
            className="habit-icon-button"
            onClick={() => router.replace("/home", { scroll: false })}
            aria-label="추가 안내 닫기"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}
      {filterGoal && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-ink-600">{filterGoal.title}에 연결된 루틴</p>
          <Link className="habit-text-button" href="/home">
            모두 보기
          </Link>
        </div>
      )}
      {list.length === 0 ? (
        <section className="py-6">
          <h2 className="habit-heading mt-5">하나부터 시작해 볼까요?</h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            이어가고 싶은 실천 하나면 충분해요.
            <br />
            준비된 루틴을 골라 내 생활에 맞춰 보세요.
          </p>
          <Link className="habit-primary mt-7" href={createHref}>
            첫 루틴 만들기
            <Icon name="arrow-right" size={18} />
          </Link>
          <p className="mt-5 text-sm leading-relaxed text-ink-600">
            가입 없이 시작할 수 있어요.
            <br />
            기록은 이 기기에 저장돼요. 브라우저 데이터를 지우면 사라질 수
            있어요.
          </p>
          <Link className="habit-text-button mt-3" href="/login">
            기존 계정으로 기록 가져오기
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5">
            <div className="habit-heading-actions">
              <h2 className="habit-section-title">오늘의 작은 실천</h2>
              <Link className="habit-text-button" href={createHref}>
                <Icon name="plus" size={18} />
                추가
              </Link>
            </div>
            {focus && (
              <section
                className="habit-focus"
                aria-label={`${focus.title} 실천`}
              >
                <div className="flex items-center gap-3">
                  <HabitIcon templateId={focus.habit?.templateId} />
                  <div className="min-w-0">
                    <h3 className="break-words font-bold">{focus.title}</h3>
                    <p className="mt-1 text-sm">
                      기본 {habitTargetLabel(focus)}
                      {habitConfig(focus).minimum
                        ? ` · 작게는 ${habitConfig(focus).minimum}${habitConfig(focus).unit}`
                        : ""}{" "}
                      · {habitScheduleLabel(focus)}
                    </p>
                  </div>
                </div>
                <p className="habit-focus-note">
                  {entryFor(focus, todayLog)
                    ? entryLabel(entryFor(focus, todayLog))
                    : habitConfig(focus).cue || "짧게 해도, 오늘의 시작이에요."}
                </p>
                {focus.habit?.weeklyTarget && (
                  <p className="mb-3 text-sm">
                    이번 주 {weeklyProgress(focus, tracking.logs, today).done} /{" "}
                    {weeklyProgress(focus, tracking.logs, today).target}일 ·
                    아무 요일에나
                  </p>
                )}
                {focus.loopId &&
                  tracking.goalLoops.find((g) => g.id === focus.loopId) && (
                    <Link
                      className="mb-3 block text-sm underline underline-offset-4"
                      href={`/goals/${encodeURIComponent(focus.loopId)}`}
                    >
                      {
                        tracking.goalLoops.find((g) => g.id === focus.loopId)
                          ?.title
                      }
                    </Link>
                  )}
                <button
                  className="habit-primary w-full"
                  onClick={() => setRecord({ routine: focus, date: today })}
                >
                  <Icon name="check" size={18} />
                  {entryFor(focus, todayLog)
                    ? "기록 수정하기"
                    : "실천 기록하기"}
                </button>
              </section>
            )}
            {scheduled.length ? (
              rows(scheduled.filter((r) => r.id !== focus?.id))
            ) : !focus ? (
              <p className="py-4 text-ink-600">오늘 지정된 실천은 없어요.</p>
            ) : null}
          </section>
          {flexible.some((r) => r.id !== focus?.id) && (
            <section className="mt-8">
              <h2 className="habit-section-title">이번 주 자유롭게</h2>
              <p className="mb-3 text-sm text-ink-600">
                아무 요일에나 실천해요. 작게 실천한 날도 포함해요.
              </p>
              {rows(flexible.filter((r) => r.id !== focus?.id))}
            </section>
          )}
          {due.length > 0 && (
            <div className="habit-day-summary">
              <span>
                실천한 루틴{" "}
                <strong>
                  {practiced} / {due.length}
                </strong>
              </span>
              <span>작은 실천도 남아요</span>
            </div>
          )}
          {due.length === 0 && (
            <Link className="habit-text-button mt-4" href={createHref}>
              <Icon name="plus" size={18} />
              다른 루틴 고르기
            </Link>
          )}
          {due.length > 0 &&
            !todayLog?.values &&
            !Object.values(todayLog?.done ?? {}).some(Boolean) && (
              <p className="mt-5 text-sm leading-relaxed text-ink-600">
                실제로 한 뒤 기록해 주세요.
                <br />
                바쁜 날에는 작게 시작해도 괜찮아요.
              </p>
            )}
          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="habit-section-title">다음 실천</h2>
              <ul className="space-y-3">
                {upcoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap justify-between gap-2 text-ink-600"
                  >
                    <span>{r.title}</span>
                    <span>
                      {nextHabitDate(r, today)} · {habitScheduleLabel(r)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {record && (
        <HabitRecordDialog
          key={`${record.routine.id}-${record.date}`}
          routine={record.routine}
          date={record.date}
          entry={entryFor(
            record.routine,
            tracking.logs.find((l) => l.date === record.date),
          )}
          onClose={() => setRecord(null)}
          onSaved={(rewards) => {
            setFeedback("실천 기록을 이 기기에 저장했어요.");
            if (rewards.length) setGrowth(rewards);
          }}
        />
      )}
      {growth && (
        <GrowthDialog rewards={growth} onClose={() => setGrowth(null)} />
      )}
    </div>
  );
}
