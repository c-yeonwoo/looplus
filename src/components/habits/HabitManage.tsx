"use client";

import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/lib/store/useProfile";
import { habitScheduleLabel, habitTargetLabel } from "@/lib/habits";
import { HabitIcon } from "./HabitIcon";

export function HabitManage() {
  const routines = useProfile((s) => s.profile.tracking.routines);
  const archive = useProfile((s) => s.removeRoutine);
  const [message, setMessage] = useState("");
  const active = routines.filter((r) => r.habit && !r.archivedAt);
  return (
    <section className="habit-page mb-10">
      <h2 className="habit-section-title">일상 루틴</h2>
      <p className="mb-5 text-sm text-ink-600">
        기록량은 오늘·기록 탭에서 수정할 수 있어요. 보관하면 오늘부터 실행
        목록에서 숨기고, 이전 기록은 남겨요. 일정 변경은 아직 지원하지 않아요.
      </p>
      {active.length ? (
        <ul className="habit-list">
          {active.map((r) => (
            <li key={r.id} className="habit-routine">
              <HabitIcon templateId={r.habit?.templateId} />
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-ink-600">
                  {habitTargetLabel(r)} · {habitScheduleLabel(r)}
                </p>
              </div>
              <button
                className="habit-secondary shrink-0"
                aria-label={`${r.title} 보관`}
                onClick={() => {
                  if (
                    !window.confirm(
                      `‘${r.title}’ 루틴을 보관할까요? 이전 기록은 남고 오늘부터 실행 목록에서 숨겨져요.`,
                    )
                  )
                    return;
                  try {
                    archive(r.id);
                    setMessage(
                      "루틴을 보관했어요. 이전 기록은 기록 탭에 남아 있어요.",
                    );
                  } catch {
                    setMessage(
                      "보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.",
                    );
                  }
                }}
              >
                보관
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-ink-600">사용 중인 일상 루틴이 없어요.</p>
      )}
      {message && (
        <p role="status" className="habit-notice mt-4">
          {message}
        </p>
      )}
      <Link className="habit-text-button mt-4" href="/home">
        오늘로 돌아가기
      </Link>
    </section>
  );
}
