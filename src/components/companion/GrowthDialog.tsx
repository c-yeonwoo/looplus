"use client";
import { useEffect, useRef } from "react";
import { useProfile } from "@/lib/store/useProfile";
import {
  characterLine,
  companionStage,
  companionStats,
  type CompanionReward,
} from "@/lib/companion";
import { useToday } from "@/lib/habits/useToday";
import { Character } from "./Character";
import { Icon } from "../Icon";

export function GrowthDialog({
  rewards = [],
  onClose,
  returnLabel = "오늘로 돌아가기",
}: {
  rewards?: CompanionReward[];
  onClose: () => void;
  returnLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tracking = useProfile((s) => s.profile.tracking);
  const today = useToday();
  const stats = companionStats(tracking, today),
    stage = companionStage(tracking.companion);
  const name = characterLine(tracking.companion?.characterId).name;
  const newBook = rewards.some((r) => r.id === "first-book"),
    newStart = rewards.some((r) => r.id === "first-step");
  const hasBook = stage === "first-book";
  useEffect(() => {
    const element = ref.current,
      trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="habit-dialog companion-growth"
      aria-labelledby="growth-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="companion-growth-top">
        <span>{rewards.length ? "새로운 성장" : "우리의 성장 기록"}</span>
        <button
          autoFocus
          className="habit-icon-button"
          onClick={onClose}
          aria-label="성장 기록 닫기"
        >
          <Icon name="x" />
        </button>
      </div>
      <h2 id="growth-title">
        {newBook ? (
          <>
            {name}에게
            <br />첫 책이 생겼어요.
          </>
        ) : newStart ? (
          <>
            {name}와<br />
            첫발을 맞췄어요.
          </>
        ) : hasBook ? (
          <>
            {name}의 첫 취향,
            <br />책 읽기.
          </>
        ) : (
          <>
            우리의 이야기는
            <br />
            조금씩 자라요.
          </>
        )}
      </h2>
      <p className="companion-growth-copy">
        {hasBook ? (
          <>
            조금씩 읽어온 시간이
            <br />
            새로운 취향이 되었어요.
          </>
        ) : (
          <>
            많이 하지 않아도 괜찮아요.
            <br />
            나의 속도로 함께 시작해요.
          </>
        )}
      </p>
      <Character
        characterId={tracking.companion?.characterId}
        stage={stage}
        activity={hasBook ? "celebrate" : "idle"}
        className={
          rewards.length
            ? "companion-growth-art is-new"
            : "companion-growth-art"
        }
      />
      <p className="companion-keepsake">
        {hasBook
          ? "첫 번째 취향 · 노란 책"
          : stage === "together"
            ? "첫 번째 기억 · 함께 시작"
            : "아직 기록이 없어도, 반가워요"}
      </p>
      <dl className="companion-growth-stats">
        <div>
          <dt>실천한 날</dt>
          <dd>{stats.practiceDays}일</dd>
        </div>
        <div>
          <dt>함께 읽은 시간</dt>
          <dd>{Number(stats.readingMinutes.toFixed(2))}분</dd>
        </div>
      </dl>
      {!hasBook && (
        <p className="companion-next">
          독서한 날 {Math.min(stats.readingDays, 4)} / 4일 · 첫 책을 향해
          <br />
          <span>
            {stats.readingDays >= 4
              ? "다음 실천 기록을 저장하면 첫 책이 생겨요."
              : "연속일 필요 없어요. 짧게 읽은 날도 포함해요."}
          </span>
        </p>
      )}
      <button className="habit-primary w-full" onClick={onClose}>
        {returnLabel}
        <Icon name="arrow-right" size={18} />
      </button>
      <p className="companion-growth-note">
        실제 기록은 수정한 양을 그대로 보여줘요.
        <br />
        쉬거나 기록을 지워도, 얻은 소품은 남아요.
      </p>
    </dialog>
  );
}
