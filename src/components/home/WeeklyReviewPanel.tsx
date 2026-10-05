"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { formatKRW, formatPct } from "@/lib/format";
import { formatLoopValue } from "@/lib/loops";
import { useProfile } from "@/lib/store/useProfile";
import type { WeeklyPlanDecision } from "@/lib/types";
import { dateKey } from "@/lib/tracking";
import { useDerived } from "@/lib/useDerived";
import { buildWeeklyReview, matchesWeeklyReview, previousWeeklyReview } from "@/lib/weeklyReview";
import { Badge, Button, Card, TextInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

const PLAN_OPTIONS: { value: WeeklyPlanDecision; label: string; hint: string }[] = [
  { value: "continue", label: "유지", hint: "현재 계획을 이어가요" },
  { value: "adjust", label: "조정", hint: "다음 행동이나 계획을 바꿔요" },
  { value: "pause", label: "잠시 멈춤", hint: "다시 시작할 시점을 정해요" },
];

/** 입력값을 확인한 시점만 기준선으로 남기는 주간 점검. */
export function WeeklyReviewPanel() {
  const profile = useProfile((s) => s.profile);
  const saveWeeklyReview = useProfile((s) => s.saveWeeklyReview);
  const setFocusLoop = useProfile((s) => s.setFocusLoop);
  const { stage } = useDerived();
  const [nextStep, setNextStep] = useState("");
  const [planDecision, setPlanDecision] = useState<WeeklyPlanDecision>("continue");
  const reviews = profile.tracking.weeklyReviews;
  const focusLoop = profile.tracking.goalLoops.find(
    (loop) => loop.id === profile.tracking.focusLoopId && !loop.completedAt,
  );
  const activeGoals = profile.tracking.goalLoops.filter((loop) => !loop.completedAt);
  const preview = stage
    ? buildWeeklyReview(profile, stage.metrics, new Date(), nextStep, {
        focusLoopId: focusLoop?.id,
        planDecision,
        nextStepLoopId: planDecision === "pause" ? undefined : focusLoop?.id,
      })
    : null;
  const current = preview ? reviews.find((review) => review.weekStart === preview.weekStart) : undefined;
  const previous = preview ? previousWeeklyReview(reviews, preview.weekStart) : undefined;
  const needsRefresh = Boolean(current && preview && !matchesWeeklyReview(current, preview));
  const history = [...reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 8);

  useEffect(() => {
    setNextStep(current?.nextStep ?? "");
    setPlanDecision(current?.planDecision ?? "continue");
  }, [current?.checkedAt, current?.nextStep, current?.planDecision]);

  if (!preview || !stage) return null;

  const save = () => {
    const review = buildWeeklyReview(profile, stage.metrics, new Date(), nextStep, {
      focusLoopId: focusLoop?.id,
      planDecision,
      nextStepLoopId: planDecision === "pause" ? undefined : focusLoop?.id,
    });
    saveWeeklyReview(review);
    if (!current) track("weekly_checkin", { loop_count: review.loops.length });
    track("weekly_plan_decided", {
      decision: planDecision,
      has_focus: Boolean(focusLoop),
      has_next_step: Boolean(review.nextStep),
      next_step_linked_to_focus: Boolean(review.nextStep && focusLoop),
      is_update: Boolean(current),
    });
    track("weekly_review_saved", {
      is_update: Boolean(current),
      has_previous: Boolean(previous),
      has_focus: Boolean(focusLoop),
      plan_decision: planDecision,
      has_next_step: Boolean(review.nextStep),
      loop_count: review.loops.length,
      scheduled_count: review.loops.reduce((sum, loop) => sum + loop.scheduled, 0),
      done_count: review.loops.reduce((sum, loop) => sum + loop.done, 0),
    });
  };

  return (
    <section id="weekly-review" className="space-y-3 scroll-mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
            <Icon name="check-circle" size={16} className="text-sage-600" /> 이번 주 점검
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">
            현재 수치를 확인하고 기록하세요. 루틴 실행과 목표 수치의 변화는 따로 보여 줍니다.
          </p>
        </div>
        <Badge tone={current && !needsRefresh ? "emerald" : "slate"}>
          {needsRefresh
            ? "변경됨 · 점검 갱신 필요"
            : current
              ? `${dateKey(new Date(current.checkedAt)).slice(5).replace("-", "/")} 점검함`
              : "이번 주 미점검"}
        </Badge>
      </div>

      <Card className="space-y-4">
        {previous?.nextStep && !current && (
          <div className="rounded-lg border border-gold-200 bg-gold-50/50 px-3 py-2.5 text-xs">
            <span className="font-bold text-gold-700">
              {previous.planDecision === "pause" ? "지난 점검에서 남긴 메모" : "지난 점검에서 정한 한 걸음"}
            </span>
            <span className="ml-2 text-ink-700">{previous.nextStep}</span>
            {previous.planDecision !== "pause" && (
              <Link href={trackingReviewHref(previous)} className="ml-2 font-semibold text-gold-700 hover:underline">
                루틴으로 등록 →
              </Link>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <ReviewMetric
            label="현재 순자산"
            value={formatKRW(preview.netWorth)}
            previous={previous ? signedChange(preview.netWorth - previous.netWorth, "networth") : undefined}
          />
          <ReviewMetric
            label="현재 저축률"
            value={formatPct(preview.savingsRatePct)}
            previous={previous ? signedChange(preview.savingsRatePct - previous.savingsRatePct, "savings_rate") : undefined}
          />
        </div>

        {preview.loops.length > 0 && (
          <div className="space-y-2 border-t border-ink-100 pt-4">
            <div className="text-xs font-bold text-ink-600">마일스톤별 현황</div>
            {preview.loops.map((item) => {
              const loop = profile.tracking.goalLoops.find((candidate) => candidate.id === item.loopId);
              if (!loop) return null;
              const before = previous?.loops.find((candidate) => candidate.loopId === item.loopId);
              return (
                <div key={item.loopId} className="rounded-lg bg-ink-50/70 px-3 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-bold text-ink-700">{loop.title}</span>
                    <span className="font-semibold text-ink-700">
                      {formatLoopValue(loop.metric, item.current)} / {formatLoopValue(loop.metric, item.target)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-ink-400">
                    <span>
                      {before
                        ? `직전 점검 대비 ${signedChange(item.current - before.current, loop.metric)}`
                        : "첫 점검 기준선"}
                    </span>
                    <span>이번 주 루틴 {item.done}/{item.scheduled}회</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-ink-100 pt-4">
          <div className="mb-2 text-xs font-bold text-ink-600">이번 주 계획</div>
          {activeGoals.length ? (
            <label className="mb-2 block max-w-sm">
              <span className="mb-1 block text-xs text-ink-500">이번 주 집중 목표</span>
              <select
                value={focusLoop?.id ?? ""}
                onChange={(event) => {
                  const id = event.target.value || null;
                  setFocusLoop(id);
                  const selected = activeGoals.find((loop) => loop.id === id);
                  if (selected) track("focus_milestone_selected", { metric: selected.metric, source: "weekly_review" });
                }}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:border-brand-500"
              >
                <option value="">선택 안 함</option>
                {activeGoals.map((loop) => <option key={loop.id} value={loop.id}>{loop.title}</option>)}
              </select>
            </label>
          ) : (
            <p className="mb-2 text-xs text-ink-500">
              집중 목표를 정하면 다음 행동을 연결할 수 있어요. <Link href="/goals" className="font-semibold text-gold-700 hover:underline">로드맵에서 선택 →</Link>
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {PLAN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={planDecision === option.value}
                onClick={() => {
                  if (planDecision === "pause" || option.value === "pause") setNextStep("");
                  setPlanDecision(option.value);
                }}
                className={planDecision === option.value
                  ? "rounded-lg border border-brand-400 bg-brand-50 px-2 py-2 text-left text-xs text-brand-800"
                  : "rounded-lg border border-ink-200 bg-white px-2 py-2 text-left text-xs text-ink-600 hover:border-brand-300"}
              >
                <span className="block font-bold">{option.label}</span>
                <span className="mt-0.5 block leading-snug opacity-75">{option.hint}</span>
              </button>
            ))}
          </div>
          <label htmlFor="weekly-next-step" className="mb-2 mt-4 block text-xs font-bold text-ink-600">
            {planDecision === "pause" ? "다시 시작할 시점 또는 메모" : planDecision === "adjust" ? "바꿀 계획 또는 다음 행동" : "다음에 이어갈 한 걸음"}
            <span className="font-normal text-ink-400"> (선택)</span>
          </label>
          <TextInput
            id="weekly-next-step"
            value={nextStep}
            onChange={(value) => setNextStep(value.slice(0, 160))}
            placeholder={planDecision === "pause" ? "예: 다음 달부터 다시 적립 시작" : stage.nextStep || "예: 이번 주 지출 확인하기"}
          />
          {planDecision === "pause" && (
            <p className="mt-2 text-xs text-ink-400">
              연결된 루틴 일정도 쉬려면 <Link
                href={focusLoop ? `/tracking?loop=${encodeURIComponent(focusLoop.id)}` : "/tracking"}
                className="font-semibold text-gold-700 hover:underline"
              >루틴 화면에서 조정해 주세요</Link>.
            </p>
          )}
          {current?.nextStep && current.planDecision !== "pause" && (
            <Link
              href={trackingReviewHref(current)}
              className="mt-2 inline-block text-xs font-semibold text-sage-700 hover:underline"
            >
              저장한 한 걸음을 루틴으로 등록 →
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] leading-relaxed text-ink-400">
            {previous
              ? `비교 기준: ${dateKey(new Date(previous.checkedAt))}에 확인한 수치`
              : "첫 점검을 저장하면 다음 점검부터 변화를 비교할 수 있어요."}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/engine?edit=diagnosis" className="text-xs font-semibold text-ink-500 hover:underline">
              현황 수정
            </Link>
            <Button onClick={save} className="!py-2 !text-xs">
              {current ? "점검 갱신" : "수치 확인하고 점검 저장"}
            </Button>
          </div>
        </div>
      </Card>
      {history.length > 0 && (
        <details className="rounded-lg border border-ink-100 bg-white px-4 py-3 text-xs">
          <summary className="cursor-pointer font-semibold text-ink-600">
            저장된 점검 {reviews.length}주 보기{reviews.length > 8 ? " · 최근 8주" : ""}
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((review) => {
              const done = review.loops.reduce((sum, loop) => sum + loop.done, 0);
              const scheduled = review.loops.reduce((sum, loop) => sum + loop.scheduled, 0);
              return (
                <div key={review.weekStart} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-2 text-ink-500">
                  <span className="font-semibold text-ink-700">{review.weekStart} 주간</span>
                  <span>순자산 {formatKRW(review.netWorth)} · 저축률 {formatPct(review.savingsRatePct)} · 루틴 {done}/{scheduled}회</span>
                  {review.planDecision && <span className="font-semibold text-brand-700">계획 {PLAN_OPTIONS.find((item) => item.value === review.planDecision)?.label}</span>}
                  {review.nextStep && (
                    <span className="w-full text-ink-400">
                      {review.planDecision === "pause" ? "다음 계획 메모" : "다음 한 걸음"}: {review.nextStep}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}

function trackingReviewHref(review: { weekStart: string; nextStepLoopId?: string; focusLoopId?: string }): string {
  const params = new URLSearchParams({ review: review.weekStart });
  const loopId = review.nextStepLoopId ?? review.focusLoopId;
  if (loopId) params.set("loop", loopId);
  return `/tracking?${params.toString()}`;
}

function ReviewMetric({ label, value, previous }: { label: string; value: string; previous?: string }) {
  return (
    <div className="rounded-lg bg-sage-50/60 p-3">
      <div className="text-[11px] font-semibold text-sage-700">{label}</div>
      <div className="tnum mt-1 text-lg font-bold text-ink-800">{value}</div>
      {previous && <div className="mt-1 text-[11px] text-ink-500">직전 점검 대비 {previous}</div>}
    </div>
  );
}

function signedChange(value: number, metric: Parameters<typeof formatLoopValue>[0]): string {
  if (Math.abs(value) < 0.001) return "변화 없음";
  return `${value > 0 ? "+" : "−"}${formatLoopValue(metric, Math.abs(value))}`;
}
