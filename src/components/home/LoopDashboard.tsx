"use client";

import Link from "next/link";
import { useDerived } from "@/lib/useDerived";
import { LOOP_METRICS, getLoopProgress } from "@/lib/loops";
import { useProfile } from "@/lib/store/useProfile";
import { formatKRW } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

/** 홈에서 "지금 무엇을 반복하고, 어떤 큰 목표를 밀고 있는지"만 압축해 보여 준다. */
export function LoopDashboard() {
  const profile = useProfile((s) => s.profile);
  const { stage } = useDerived();
  const loops = profile.tracking.goalLoops;
  const vision = profile.vision;
  const hasVisionLoop = Boolean(vision && (vision.goalNetworth > 0 || vision.goalPassiveIncome > 0));

  if (!hasVisionLoop && loops.length === 0) return null;

  const activeLoops = loops.filter((loop) => !loop.completedAt);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
            <Icon name="loop" size={16} className="text-gold-600" />
            지금 돌리는 루프
          </div>
          <p className="mt-0.5 text-xs text-ink-400">작은 실행이 큰 목표를 얼마나 밀고 있는지 확인하세요.</p>
        </div>
        <Link href="/goals" className="text-xs font-semibold text-gold-600 hover:underline">
          큰 루프 관리
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasVisionLoop && vision && (
          <Card className="border-brand-200 bg-brand-50/35">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-brand-700">대표 큰 루프</div>
                <div className="mt-1 text-sm font-bold text-ink-900">자산 자유 루프</div>
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
            <p className="mt-3 text-xs text-ink-500">{vision.targetYears}년 안에 도달하는 장기 루프예요.</p>
          </Card>
        )}

        {activeLoops.slice(0, hasVisionLoop ? 1 : 2).map((loop) => {
          const progress = getLoopProgress(
            loop,
            profile.snapshot,
            stage?.metrics,
            profile.tracking.routines,
          );
          return (
            <Link key={loop.id} href="/goals" className="block">
              <Card className="h-full transition-colors hover:border-gold-300 hover:bg-gold-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink-800">{loop.title}</div>
                    <p className="mt-1 text-xs text-ink-400">
                      {LOOP_METRICS[loop.metric].shortLabel} {progress.currentLabel} / {progress.targetLabel}
                    </p>
                  </div>
                  <Badge tone="slate">작은 루프 {progress.smallLoopCount}</Badge>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.max(2, progress.pct)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-700">{progress.pct.toFixed(0)}% 진행</span>
                  <span className="text-ink-400">{loop.targetYears ? `${loop.targetYears}년 안` : "기한 없음"}</span>
                </div>
              </Card>
            </Link>
          );
        })}

        {activeLoops.length === 0 && hasVisionLoop && (
          <Link href="/goals" className="block">
            <Card className="flex h-full items-center gap-3 border-dashed border-ink-300 bg-ink-50/50 hover:border-gold-300">
              <Icon name="plus" size={20} className="text-gold-600" />
              <div>
                <div className="text-sm font-bold text-ink-700">다음 큰 루프 열기</div>
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
