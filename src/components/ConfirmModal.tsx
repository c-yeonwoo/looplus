"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./ui";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/40"
        aria-label="닫기"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-5 shadow-lg">
        <h2 id="confirm-title" className="text-base font-bold text-ink-900">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-600">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-ink-300 px-3.5 py-2 text-[13px] font-semibold text-ink-800 hover:border-gold-500 hover:bg-gold-50"
          >
            {cancelLabel}
          </button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
