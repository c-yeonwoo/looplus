"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/store/useProfile";
import { useSaveStatus } from "@/lib/store/saveStatus";

/**
 * 자동 저장 인디케이터.
 * 프로필이 바뀌면 잠깐 "저장 중…" → "저장됨". 클라우드면 SyncManager 가
 * 실제 업로드 구간을 "동기화 중…" 으로 덮어쓴다.
 */
export function SaveStatusWatcher() {
  const cloud = useSaveStatus((s) => s.cloud);
  const markPending = useSaveStatus((s) => s.markPending);
  const markSaved = useSaveStatus((s) => s.markSaved);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useProfile.subscribe((st, prev) => {
      if (st.profile === prev.profile) return;
      // 클라우드는 SyncManager 가 pending→saving→saved 를 담당
      if (cloud) {
        markPending();
        return;
      }
      markPending();
      clearTimeout(timer);
      timer = setTimeout(() => markSaved(), 350);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [cloud, markPending, markSaved]);

  return null;
}

function relativeLabel(at: number | null, now: number): string {
  if (at == null) return "";
  const sec = Math.round((now - at) / 1000);
  if (sec < 4) return "방금";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분 전`;
  return "";
}

export function SaveStatusChip({ className = "" }: { className?: string }) {
  const phase = useSaveStatus((s) => s.phase);
  const savedAt = useSaveStatus((s) => s.savedAt);
  const cloud = useSaveStatus((s) => s.cloud);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "saved") return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [phase]);

  if (phase === "idle") return null;

  let label: string;
  if (phase === "pending" || phase === "saving") {
    label = cloud && phase === "saving" ? "동기화 중…" : "저장 중…";
  } else if (phase === "error") {
    label = "저장 실패";
  } else {
    const rel = relativeLabel(savedAt, now);
    label = cloud
      ? rel
        ? `클라우드 저장됨 · ${rel}`
        : "클라우드 저장됨"
      : rel
        ? `이 기기에 저장됨 · ${rel}`
        : "이 기기에 저장됨";
  }

  const tone =
    phase === "error"
      ? "text-red-600"
      : phase === "saved"
        ? "text-ink-400"
        : "text-ink-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${tone} ${className}`}
      aria-live="polite"
    >
      {(phase === "pending" || phase === "saving") && (
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-400"
          aria-hidden
        />
      )}
      {phase === "saved" && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      )}
      {phase === "error" && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
      )}
      {label}
    </span>
  );
}
