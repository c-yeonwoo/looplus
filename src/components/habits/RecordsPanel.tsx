"use client";
import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/lib/store/useProfile";
import { entryFor, entryLabel, isHabitDue } from "@/lib/habits";
import { useToday } from "@/lib/habits/useToday";
import type { RoutineItem } from "@/lib/types";
import { HabitIcon } from "./HabitIcon";
import { HabitRecordDialog } from "./HabitRecordDialog";
import { addDays, parseDateKey } from "@/lib/tracking";
import { Icon } from "../Icon";
import { GrowthDialog } from "../companion/GrowthDialog";
import type { CompanionReward } from "@/lib/companion";

export function RecordsPanel() {
  const tracking = useProfile((s) => s.profile.tracking);
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const date = selected ?? today;
  const [record, setRecord] = useState<RoutineItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [growth, setGrowth] = useState<CompanionReward[] | null>(null);
  const log = tracking.logs.find((l) => l.date === date);
  const recorded = tracking.routines.filter((r) => Boolean(entryFor(r, log)));
  const missed = tracking.routines.filter(
    (r) => isHabitDue(r, date) && !entryFor(r, log),
  );
  return (
    <div className="habit-page">
      <h1 className="habit-title">기록</h1>
      <p className="mt-3 text-ink-600">이어온 실천을 날짜별로 돌아봐요.</p>
      <div className="mt-7 flex items-end gap-2">
        <button
          className="habit-icon-button"
          onClick={() => setSelected(addDays(date, -1))}
          aria-label="이전 날"
        >
          <Icon name="chevron-left" />
        </button>
        <label className="habit-field min-w-0 flex-1">
          기록 날짜
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              if (e.target.value && e.target.value <= today) {
                setSelected(e.target.value);
                setFeedback("");
              }
            }}
          />
        </label>
        <button
          className="habit-icon-button"
          disabled={date >= today}
          onClick={() => setSelected(addDays(date, 1))}
          aria-label="다음 날"
        >
          <Icon name="chevron-right" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1" aria-label="최근 일주일">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(
          (key) => {
            const hasRecord = tracking.routines.some((r) =>
              entryFor(
                r,
                tracking.logs.find((l) => l.date === key),
              ),
            );
            return (
              <button
                key={key}
                className="habit-day"
                aria-pressed={date === key}
                aria-label={`${key}${hasRecord ? " 실천 기록 있음" : ""}`}
                onClick={() => {
                  setSelected(key);
                  setFeedback("");
                }}
              >
                {parseDateKey(key).getDate()}
                <span className="block text-xs">
                  {hasRecord ? "기록" : "—"}
                </span>
              </button>
            );
          },
        )}
      </div>
      {feedback && (
        <p className="habit-notice mt-5" role="status">
          {feedback}
        </p>
      )}
      <h2 className="habit-section-title mt-8">{date}의 실천</h2>
      {recorded.length ? (
        <ul className="habit-list">
          {recorded.map((r) => (
            <li className="habit-routine" key={r.id}>
              <HabitIcon templateId={r.habit?.templateId} />
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-gold-600">
                  {entryLabel(entryFor(r, log))}
                </p>
              </div>
              {isHabitDue(r, date) && (
                <button
                  className="habit-secondary"
                  aria-label={`${r.title} 기록 수정`}
                  onClick={() => setRecord(r)}
                >
                  수정
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 leading-relaxed text-ink-600">
          이날 남긴 기록이 없어요.
          <br />
          실천했다면 아래에서 기록할 수 있어요.
        </p>
      )}
      {missed.length > 0 && (
        <details className="habit-category mt-6">
          <summary>
            이날의 실천 기록하기
            <span className="ml-auto">{missed.length}개</span>
          </summary>
          <ul>
            {missed.map((r) => (
              <li className="habit-routine" key={r.id}>
                <span className="min-w-0 flex-1 break-words">{r.title}</span>
                <button
                  className="habit-secondary"
                  onClick={() => setRecord(r)}
                >
                  기록
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {tracking.routines.length === 0 && (
        <Link className="habit-primary mt-5" href="/routines/new">
          첫 루틴 만들기
        </Link>
      )}
      {record && (
        <HabitRecordDialog
          key={`${record.id}-${date}`}
          routine={record}
          date={date}
          entry={entryFor(record, log)}
          onClose={() => setRecord(null)}
          onSaved={(rewards) => {
            setFeedback(`${date} 기록을 저장했어요.`);
            if (rewards.length) setGrowth(rewards);
          }}
        />
      )}
      {growth && (
        <GrowthDialog
          rewards={growth}
          returnLabel="기록으로 돌아가기"
          onClose={() => setGrowth(null)}
        />
      )}
    </div>
  );
}
