"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useProfile } from "@/lib/store/useProfile";
import { Icon } from "../Icon";

export function HabitGoalsPanel() {
  const tracking = useProfile((s) => s.profile.tracking);
  const addGoal = useProfile((s) => s.addGoalLoop);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const personal = tracking.goalLoops.filter((g) => g.metric === "custom");
  const financial = tracking.goalLoops.filter((g) => g.metric !== "custom");
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("이어가고 싶은 목표를 적어 주세요.");
      return;
    }
    try {
      addGoal({
        title,
        note,
        metric: "custom",
        targetValue: 100,
        manualProgressPct: 0,
      });
      setTitle("");
      setNote("");
      setCreating(false);
      setError("");
    } catch {
      setError(
        "저장 공간을 확인해 주세요. 목표가 목록에 추가되었는지도 확인해 주세요.",
      );
    }
  };
  return (
    <div className="habit-page">
      <header className="flex items-start justify-between gap-4">
        <h1 className="habit-title">목표</h1>
        <button
          className="habit-text-button"
          onClick={() => setCreating(!creating)}
          aria-expanded={creating}
        >
          <Icon name={creating ? "x" : "plus"} size={18} />
          {creating ? "닫기" : "목표"}
        </button>
      </header>
      <p className="mt-3 text-ink-600">
        어떤 일상을 만들고 싶나요?
        <br />
        목표에 루틴을 연결해 한 걸음씩 이어가요.
      </p>
      {creating && (
        <form
          onSubmit={save}
          className="mt-7 space-y-4 rounded-xl border border-ink-200 p-5"
        >
          <label className="habit-field">
            이루고 싶은 목표
            <input
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 책과 가까운 일상 만들기"
            />
          </label>
          <label className="habit-field">
            나에게 중요한 이유 (선택)
            <textarea
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="바쁜 하루에도 나를 위한 시간을 갖고 싶어요."
              rows={3}
            />
          </label>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <button className="habit-primary" type="submit">
            목표 만들기
          </button>
        </form>
      )}
      {personal.length ? (
        <ul className="habit-list mt-8">
          {personal.map((g) => (
            <li key={g.id}>
              <Link
                href={`/goals/${encodeURIComponent(g.id)}`}
                className="habit-choice"
              >
                <Icon
                  name="target"
                  size={24}
                  className="shrink-0 text-gold-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold">
                    {g.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink-600">
                    {g.completedAt
                      ? "달성했어요"
                      : `이어가는 루틴 ${tracking.routines.filter((r) => r.loopId === g.id && !r.archivedAt).length}개`}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !creating && (
          <section className="py-12">
            <h2 className="habit-heading">작은 실천부터 시작해도 좋아요.</h2>
            <p className="mt-3 text-ink-600">
              목표는 나중에 정해도 괜찮아요.
              <br />
              먼저 익숙해지고 싶은 루틴을 골라 보세요.
            </p>
            <Link className="habit-primary mt-6" href="/routines/new">
              루틴 고르기
            </Link>
          </section>
        )
      )}
      {financial.length > 0 && (
        <details className="habit-category mt-8">
          <summary>
            기존 금융 목표
            <span className="ml-auto text-sm text-ink-600">
              {financial.length}개
            </span>
          </summary>
          <ul className="px-4">
            {financial.map((g) => (
              <li key={g.id}>
                <Link
                  className="habit-choice"
                  href={`/goals/${encodeURIComponent(g.id)}`}
                >
                  {g.title}
                  <Icon name="chevron-right" size={18} className="ml-auto" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/tools/money/goals" className="habit-text-button m-2">
            금융 목표 관리
          </Link>
        </details>
      )}
    </div>
  );
}
