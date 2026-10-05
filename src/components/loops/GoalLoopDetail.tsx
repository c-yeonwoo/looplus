"use client";

import Link from "next/link";
import { useDerived } from "@/lib/useDerived";
import { formatLoopValue, getLoopProgress, LOOP_METRICS } from "@/lib/loops";
import { useProfile } from "@/lib/store/useProfile";
import { dateKey, formatSchedule, isRoutineScheduled, mondayOf } from "@/lib/tracking";
import { track } from "@/lib/analytics";
import { Badge, Button, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function GoalLoopDetail({ goalId }: { goalId: string }) {
  const profile = useProfile((state) => state.profile);
  const completeGoalLoop = useProfile((state) => state.completeGoalLoop);
  const { stage } = useDerived();
  const loop = profile.tracking.goalLoops.find((item) => item.id === goalId);

  if (!loop) {
    return (
      <div className="space-y-5">
        <Link href="/goals" className="text-sm font-semibold text-gold-700 hover:underline">← 로드맵으로</Link>
        <Card>
          <div className="font-bold text-ink-800">마일스톤을 찾을 수 없어요</div>
          <p className="mt-1 text-sm text-ink-500">이미 지웠거나 다른 기기에서 변경했을 수 있어요.</p>
          <Link href="/goals" className="mt-4 inline-block"><Button>마일스톤 목록 보기</Button></Link>
        </Card>
      </div>
    );
  }

  const progress = getLoopProgress(
    loop,
    profile.snapshot,
    stage?.metrics,
    profile.tracking.routines,
  );
  const routines = profile.tracking.routines
    .filter((routine) => routine.loopId === loop.id)
    .sort((a, b) => a.position - b.position);
  const today = dateKey();
  const weekStart = mondayOf(today);
  const review = [...profile.tracking.weeklyReviews]
    .filter((entry) => entry.loops.some((item) => item.loopId === loop.id))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  const reviewedLoop = review?.loops.find((item) => item.loopId === loop.id);

  return (
    <div className="space-y-5">
      <Link href="/goals" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700 hover:underline">
        <Icon name="arrow-right" size={13} className="rotate-180" /> 로드맵으로
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="target" size={20} className="text-gold-600" />
          <h1 className="text-xl font-extrabold tracking-tight text-ink-800">{loop.title}</h1>
          {loop.completedAt && <Badge tone="emerald">달성</Badge>}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          {loop.note || "이 목표를 향해 계획을 세우고, 연결된 루틴을 이어가 보세요."}
        </p>
      </header>

      <Card className="space-y-4 border-brand-200 bg-brand-50/40">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-brand-700">현재 진척 · {LOOP_METRICS[loop.metric].shortLabel}</div>
            <div className="tnum mt-1 text-2xl font-extrabold text-ink-900">
              {progress.currentLabel}<span className="mx-1 text-base font-medium text-ink-300">/</span>{progress.targetLabel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-brand-700">{progress.pct.toFixed(0)}%</div>
            <div className="text-xs text-ink-400">{loop.targetYears ? `${loop.targetYears}년 안에 도달` : "기한 없음"}</div>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${Math.max(2, progress.pct)}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-brand-100 pt-4">
          <Link href={`/engine?goal=${encodeURIComponent(loop.id)}`}>
            <Button><Icon name="engine" size={14} /> 이 목표의 자산 설계 보기</Button>
          </Link>
          {!loop.completedAt && (
            <Link href={`/tracking?loop=${encodeURIComponent(loop.id)}`}>
              <Button variant="outline"><Icon name="plus" size={14} /> 이 목표의 루틴 추가</Button>
            </Link>
          )}
          {!loop.completedAt && progress.hasReachedTarget && (
            <Button
              variant="outline"
              className="border-sage-300 text-sage-700"
              onClick={() => {
                completeGoalLoop(loop.id);
                track("goal_loop_completed", { metric: loop.metric, source: "manual" });
              }}
            >
              <Icon name="check-circle" size={14} /> 달성 확인
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-ink-800">
              <Icon name="loop" size={16} className="text-gold-600" /> 이어갈 루틴
            </div>
            <Badge tone="slate">{routines.length}개</Badge>
          </div>
          {routines.length ? (
            <ul className="divide-y divide-ink-100">
              {routines.map((routine) => {
                const doneThisWeek = profile.tracking.logs.filter((log) => {
                  if (log.date < weekStart || log.date > today || !isRoutineScheduled(routine, log.date)) return false;
                  const created = new Date(routine.createdAt);
                  if (!Number.isNaN(created.getTime()) && dateKey(created) > log.date) return false;
                  return Boolean(log.done[routine.id]);
                }).length;
                return (
                  <li key={routine.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink-700">{routine.title}</div>
                      <div className="mt-1 text-xs text-ink-400">{formatSchedule(routine.schedule)} · 이번 주 {doneThisWeek}회 완료</div>
                    </div>
                    <Icon name="check-circle" size={16} className="mt-0.5 shrink-0 text-sage-500" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500">
              아직 연결한 루틴이 없어요. 작은 행동 하나부터 정해 보세요.
            </div>
          )}
          <Link href={`/tracking?loop=${encodeURIComponent(loop.id)}`} className="inline-block text-xs font-semibold text-gold-700 hover:underline">
            루틴 관리하기 →
          </Link>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-800">
            <Icon name="check-circle" size={16} className="text-sage-600" /> 최근 점검
          </div>
          {review && reviewedLoop ? (
            <>
              <div className="text-xs text-ink-400">{dateKey(new Date(review.checkedAt))}에 확인한 현황</div>
              <div className="rounded-lg bg-sage-50/70 p-3">
                <div className="text-xs text-sage-700">점검 당시 {LOOP_METRICS[loop.metric].shortLabel}</div>
                <div className="tnum mt-1 font-bold text-ink-800">
                  {formatLoopValue(loop.metric, reviewedLoop.current)} / {formatLoopValue(loop.metric, reviewedLoop.target)}
                </div>
                <div className="mt-2 text-xs text-ink-500">
                  이번 주 루틴 {reviewedLoop.done}/{reviewedLoop.scheduled}회 완료
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500">
              점검 기록이 쌓이면 목표 진척과 루틴 실행을 함께 돌아볼 수 있어요.
            </div>
          )}
          <Link href="/home#weekly-review" className="inline-block text-xs font-semibold text-sage-700 hover:underline">
            이번 주 현황 점검하기 →
          </Link>
        </Card>
      </div>
    </div>
  );
}
