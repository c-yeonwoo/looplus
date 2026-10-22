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
  const tracking = profile.tracking;
  const active = tracking.routines
    .filter((r) => !r.archivedAt)
    .sort((a, b) => a.position - b.position);
  const filterGoal = tracking.goalLoops.find((g) => g.id === loopId);
  const list = filterGoal ? active.filter((r) => r.loopId === loopId) : active;
  const todayLog = tracking.logs.find((l) => l.date === today);
  const due = list.filter((r) => isHabitDue(r, today));
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
            <HabitIcon templateId={r.habit?.templateId} />
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
              className="habit-secondary shrink-0"
              aria-label={`${r.title} ${entry ? "기록 수정" : "기록"}`}
              onClick={() => setRecord({ routine: r, date: today })}
            >
              {entry ? "수정" : "기록"}
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className="habit-page">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="habit-title">오늘</h1>
          <p className="mt-2 text-ink-600">
            {new Intl.DateTimeFormat("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(parseDateKey(today))}
          </p>
        </div>
        <Link className="habit-text-button" href={createHref}>
          <Icon name="plus" size={18} />
          루틴
        </Link>
      </header>
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
        <section className="py-14">
          <Icon name="loop" size={34} className="text-gold-600" />
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
          <section className="mt-8">
            <h2 className="habit-section-title">오늘의 실천</h2>
            {scheduled.length ? (
              rows(scheduled)
            ) : (
              <p className="py-4 text-ink-600">오늘 지정된 실천은 없어요.</p>
            )}
          </section>
          {flexible.length > 0 && (
            <section className="mt-8">
              <h2 className="habit-section-title">이번 주 자유롭게</h2>
              <p className="mb-3 text-sm text-ink-600">
                아무 요일에나 실천해요. 작게 실천한 날도 포함해요.
              </p>
              {rows(flexible)}
            </section>
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
          onSaved={() => setFeedback("실천 기록을 이 기기에 저장했어요.")}
        />
      )}
    </div>
  );
}
