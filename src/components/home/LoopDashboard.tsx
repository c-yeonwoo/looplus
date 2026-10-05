"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { useDerived } from "@/lib/useDerived";
import { LOOP_METRICS, getLoopProgress } from "@/lib/loops";
import { useProfile } from "@/lib/store/useProfile";
import { formatKRW } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

/** 홈에서 지금 무엇을 반복하고, 어떤 목표를 밀고 있는지 압축해 보여 준다. */
export function LoopDashboard() {
  const profile = useProfile((s) => s.profile);
  const setFocusLoop = useProfile((s) => s.setFocusLoop);
  const { stage } = useDerived();
  const loops = profile.tracking.goalLoops;
  const vision = profile.vision;
  const hasVisionLoop = Boolean(vision && (vision.goalNetworth > 0 || vision.goalPassiveIncome > 0));

  if (!hasVisionLoop && loops.length === 0) return null;

  const activeLoops = loops.filter((loop) => !loop.completedAt);
  const focusedLoop = activeLoops.find((loop) => loop.id === profile.tracking.focusLoopId);
  const focusProgress = focusedLoop
    ? getLoopProgress(focusedLoop, profile.snapshot, stage?.metrics, profile.tracking.routines)
    : null;
  const focusRoutines = focusedLoop
    ? profile.tracking.routines.filter((routine) => routine.loopId === focusedLoop.id).slice(0, 2)
    : [];

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
            <Icon name="loop" size={16} className="text-gold-600" />
            지금 이어가는 여정
          </div>
          <p className="mt-0.5 text-xs text-ink-400">목표의 진척과 연결된 루틴을 함께 확인하세요.</p>
        </div>
        <Link href="/goals" className="text-xs font-semibold text-gold-600 hover:underline">
          마일스톤 관리
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasVisionLoop && vision && (
          <Card className="border-brand-200 bg-brand-50/35">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-brand-700">장기 비전</div>
                <div className="mt-1 text-sm font-bold text-ink-900">내가 원하는 미래</div>
              </div>
              <Icon name="target" size={18} className="text-gold-600" />
            </div>
            {vision.goalNetworth > 0 && (
              <VisionMetric
                label="순자산"
                current={stage?.metrics.netWorth ?? 0}
                target={vision.goalNetworth}
                currentLabel={formatKRW(stage?.metrics.netWorth ?? 0)}
                targetLabel={formatKRW(vision.goalNetworth)}
              />
            )}
            {vision.goalPassiveIncome > 0 && (
              <VisionMetric
                label="월 패시브"
                current={stage?.metrics.capitalMonthly ?? 0}
                target={vision.goalPassiveIncome}
                currentLabel={formatKRW(stage?.metrics.capitalMonthly ?? 0)}
                targetLabel={formatKRW(vision.goalPassiveIncome)}
              />
            )}
            <Link href="/goals" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
              비전과 로드맵 정리하기 →
            </Link>
          </Card>
        )}

        {activeLoops.length > 0 && (
          <Card className="border-gold-200 bg-gold-50/35">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="focus-milestone" className="text-xs font-semibold text-gold-700">
                  이번 주 집중 마일스톤
                </label>
                <select
                  id="focus-milestone"
                  value={focusedLoop?.id ?? ""}
                  onChange={(event) => {
                    const id = event.target.value || null;
                    setFocusLoop(id);
                    const selected = activeLoops.find((loop) => loop.id === id);
                    if (selected) track("focus_milestone_selected", { metric: selected.metric, source: "home" });
                  }}
                  className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-800 outline-none focus:border-brand-500"
                >
                  <option value="">집중할 목표를 선택하세요</option>
                  {activeLoops.map((loop) => <option key={loop.id} value={loop.id}>{loop.title}</option>)}
                </select>
              </div>
              {focusedLoop && focusProgress && (
                <Badge tone={focusProgress.hasReachedTarget ? "emerald" : "brand"}>
                  {focusProgress.hasReachedTarget ? "달성 확인 필요" : `${focusProgress.pct.toFixed(0)}% 진행`}
                </Badge>
              )}
            </div>
            {focusedLoop && focusProgress ? (
              <>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-ink-900">{focusedLoop.title}</div>
                    <p className="mt-1 text-xs text-ink-500">
                      {LOOP_METRICS[focusedLoop.metric].shortLabel} {focusProgress.currentLabel} / {focusProgress.targetLabel}
                      {focusedLoop.targetYears ? ` · ${focusedLoop.targetYears}년 안` : ""}
                    </p>
                  </div>
                  <Badge tone="slate">연결 루틴 {focusProgress.smallLoopCount}개</Badge>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.max(2, focusProgress.pct)}%` }} />
                </div>
                {focusRoutines.length > 0 && (
                  <p className="mt-3 text-xs text-ink-500">다음 루틴 · {focusRoutines.map((routine) => routine.title).join(" · ")}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/goals/${encodeURIComponent(focusedLoop.id)}`} className="text-xs font-semibold text-gold-700 hover:underline">
                    목표 상세 보기 →
                  </Link>
                  <Link href={`/tracking?loop=${encodeURIComponent(focusedLoop.id)}`} className="text-xs font-semibold text-sage-700 hover:underline">
                    이 목표의 루틴 이어가기 →
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-ink-500">이번 주 먼저 진척할 목표를 정하면 홈과 루틴에서 이어서 볼 수 있어요.</p>
            )}
          </Card>
        )}

        {activeLoops.length === 0 && hasVisionLoop && (
          <Link href="/goals" className="block">
            <Card className="flex h-full items-center gap-3 border-dashed border-ink-300 bg-ink-50/50 hover:border-gold-300">
              <Icon name="plus" size={20} className="text-gold-600" />
              <div>
                <div className="text-sm font-bold text-ink-700">다음 마일스톤 정하기</div>
                <p className="mt-1 text-xs text-ink-400">비상금·저축률·현금흐름처럼 가까운 목표부터 시작하세요.</p>
              </div>
            </Card>
          </Link>
        )}
      </div>
    </section>
  );
}

function VisionMetric({
  label,
  current,
  target,
  currentLabel,
  targetLabel,
}: {
  label: string;
  current: number;
  target: number;
  currentLabel: string;
  targetLabel: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-ink-500">{label}</span>
        <span className="font-semibold text-ink-700">{currentLabel} / {targetLabel}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
