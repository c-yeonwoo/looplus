"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { HabitEntry, RoutineItem } from "@/lib/types";
import { habitConfig } from "@/lib/habits";
import { useProfile } from "@/lib/store/useProfile";
import { Icon } from "../Icon";
import type { CompanionReward } from "@/lib/companion";

export function HabitRecordDialog({
  routine,
  date,
  entry,
  onClose,
  onSaved,
}: {
  routine: RoutineItem;
  date: string;
  entry?: HabitEntry;
  onClose: () => void;
  onSaved: (rewards: CompanionReward[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const config = habitConfig(routine);
  const [value, setValue] = useState(entry ? String(entry.value) : "");
  const [error, setError] = useState("");
  const saveValue = useProfile((s) => s.setHabitValue);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    input.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, []);
  const save = (amount: number) => {
    try {
      const rewards = saveValue(date, routine.id, amount);
      onSaved(rewards);
      onClose();
    } catch {
      setError(
        "저장하지 못했어요. 날짜·실천량과 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      config.kind !== "check" &&
      (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0)
    ) {
      setError("실제로 한 양을 0보다 큰 숫자로 입력해 주세요.");
      return;
    }
    save(config.kind === "check" ? 1 : Number(value));
  };
  return (
    <dialog
      ref={dialog}
      className="habit-dialog"
      aria-labelledby="record-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="record-title" className="habit-heading">
              {routine.title}
            </h2>
            <p className="mt-2 text-sm text-ink-600">{date}의 실천 기록</p>
          </div>
          <button
            className="habit-icon-button"
            type="button"
            onClick={onClose}
            aria-label="기록 창 닫기"
          >
            <Icon name="x" />
          </button>
        </div>
        {config.kind === "check" ? (
          <p className="my-6">실제로 했다면 완료를 기록해 주세요.</p>
        ) : (
          <>
            <label className="habit-field mt-6">
              이날 실제로 한 총량 ({config.unit})
              <input
                ref={input}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="실천한 양 입력"
              />
            </label>
            <p className="mt-2 text-sm text-ink-600">
              기존 기록에 더하지 않고, 이날의 총량으로 저장해요.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ...new Set(
                  [config.minimum, config.target].filter(
                    (n): n is number => n != null,
                  ),
                ),
              ].map((n) => (
                <button
                  type="button"
                  className="habit-secondary"
                  key={n}
                  onClick={() => setValue(String(n))}
                >
                  {n}
                  {config.unit} 입력
                </button>
              ))}
            </div>
          </>
        )}
        {error && (
          <p className="mt-4 text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="habit-primary mt-6 w-full">
          {config.kind === "check" ? "했어요 · 기록 저장" : "기록 저장"}
        </button>
        {entry && (
          <button
            type="button"
            className="habit-text-button mt-3 w-full"
            onClick={() => save(0)}
          >
            이날의 기록 취소
          </button>
        )}
      </form>
    </dialog>
  );
}
