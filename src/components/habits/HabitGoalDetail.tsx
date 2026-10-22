"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useProfile } from "@/lib/store/useProfile";
import type { GoalLoop } from "@/lib/types";
import { entryFor, habitScheduleLabel, habitTargetLabel } from "@/lib/habits";
import { useToday } from "@/lib/habits/useToday";
import { mondayOf } from "@/lib/tracking";
import { Icon } from "../Icon";
import { HabitIcon } from "./HabitIcon";

export function HabitGoalDetail({ goal }: { goal: GoalLoop }) {
  const tracking = useProfile((s) => s.profile.tracking);
  const update = useProfile((s) => s.updateGoalLoop);
  const complete = useProfile((s) => s.completeGoalLoop);
  const [progress, setProgress] = useState(String(goal.manualProgressPct ?? 0));
  const [message, setMessage] = useState("");
  const today = useToday(),
    monday = mondayOf(today);
  const routines = tracking.routines.filter(
    (r) => r.loopId === goal.id && !r.archivedAt,
  );
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (
      !progress.trim() ||
      !Number.isFinite(Number(progress)) ||
      Number(progress) < 0 ||
      Number(progress) > 100
    ) {
      setMessage("진행률을 0~100 사이로 입력해 주세요.");
      return;
    }
    try {
      update(goal.id, { manualProgressPct: Number(progress) });
      setMessage("직접 확인한 진행률을 저장했어요.");
    } catch {
      setMessage("저장 공간을 확인해 주세요.");
    }
  };
  return (
    <div className="habit-page">
      <Link className="habit-text-button mb-5" href="/goals">
        <Icon name="chevron-left" size={18} />
        목표로
      </Link>
      <h1 className="habit-title">{goal.title}</h1>
      {goal.note && (
        <p className="mt-3 break-words text-ink-600">{goal.note}</p>
      )}
      {goal.completedAt ? (
        <div className="habit-notice mt-6">
          <Icon name="check-circle" size={20} />
          직접 달성을 확인한 목표예요.
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="habit-section-title">이어갈 루틴</h2>
            {routines.length > 0 ? (
              <ul className="habit-list">
                {routines.map((r) => (
                  <li className="habit-routine" key={r.id}>
                    <HabitIcon templateId={r.habit?.templateId} />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">{r.title}</h3>
                      <p className="mt-1 text-sm text-ink-600">
                        {habitTargetLabel(r)} · {habitScheduleLabel(r)}
                      </p>
                      <p className="mt-1 text-sm text-gold-600">
                        이번 주{" "}
                        {
                          tracking.logs.filter(
                            (log) =>
                              log.date >= monday &&
                              log.date <= today &&
                              entryFor(r, log),
                          ).length
                        }
                        일 실천
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-600">
                이 목표를 위한 루틴 하나를 골라 보세요.
              </p>
            )}
            <Link
              className="habit-primary mt-5"
              href={`/routines/new?goal=${encodeURIComponent(goal.id)}`}
            >
              루틴 연결하기
            </Link>
            {routines.length > 0 && (
              <Link
                className="habit-text-button mt-3 ml-2"
                href={`/home?loop=${encodeURIComponent(goal.id)}`}
              >
                오늘의 실천 보기
              </Link>
            )}
          </section>
          <details className="habit-category mt-8">
            <summary>
              목표 진행 직접 확인
              <span className="ml-auto">{goal.manualProgressPct ?? 0}%</span>
            </summary>
            <form onSubmit={save} className="space-y-4 p-4">
              <p className="text-sm text-ink-600">
                루틴 횟수가 목표 달성을 뜻하지는 않아요. 목표에 얼마나
                가까워졌는지 직접 확인해 주세요.
              </p>
              <label className="habit-field">
                내가 확인한 진행률 (%)
                <input
                  inputMode="decimal"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </label>
              <button className="habit-secondary" type="submit">
                진행률 저장
              </button>
              {(goal.manualProgressPct ?? 0) >= 100 && (
                <button
                  className="habit-primary ml-2"
                  type="button"
                  onClick={() => {
                    try {
                      complete(goal.id);
                    } catch {
                      setMessage("저장 공간을 확인해 주세요.");
                    }
                  }}
                >
                  목표 달성 확인
                </button>
              )}
            </form>
          </details>
        </>
      )}
      {message && (
        <p className="habit-notice mt-4" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
