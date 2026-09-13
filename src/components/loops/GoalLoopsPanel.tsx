"use client";

import Link from "next/link";
import { useState } from "react";
import { useDerived } from "@/lib/useDerived";
import { LOOP_METRICS, getLoopProgress, remainingLoopCopy } from "@/lib/loops";
import { useProfile } from "@/lib/store/useProfile";
import { track } from "@/lib/analytics";
import type { GoalLoopMetric } from "@/lib/types";
import { Badge, Button, Card, Field, NumberInput, TextInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

const METRICS = Object.keys(LOOP_METRICS) as GoalLoopMetric[];

export function GoalLoopsPanel() {
  const profile = useProfile((s) => s.profile);
  const addGoalLoop = useProfile((s) => s.addGoalLoop);
  const updateGoalLoop = useProfile((s) => s.updateGoalLoop);
  const completeGoalLoop = useProfile((s) => s.completeGoalLoop);
  const removeGoalLoop = useProfile((s) => s.removeGoalLoop);
  const { stage } = useDerived();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<GoalLoopMetric>("emergency_months");
  const [targetValue, setTargetValue] = useState(LOOP_METRICS.emergency_months.defaultTarget);
  const [targetYears, setTargetYears] = useState(1);
  const [note, setNote] = useState("");

  const loops = profile.tracking.goalLoops;

  const chooseMetric = (next: GoalLoopMetric) => {
    setMetric(next);
    setTargetValue(LOOP_METRICS[next].defaultTarget);
  };

  const add = () => {
    if (!title.trim() || targetValue <= 0) return;
    addGoalLoop({
      title,
      metric,
      targetValue,
      targetYears,
      note,
      ...(metric === "custom" ? { manualProgressPct: 0 } : {}),
    });
    track("goal_loop_created", { metric });
    setTitle("");
    setNote("");
    setMetric("emergency_months");
    setTargetValue(LOOP_METRICS.emergency_months.defaultTarget);
    setTargetYears(1);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-bold text-ink-800">
            <Icon name="loop" size={18} className="text-gold-600" />
            여러 개의 큰 루프
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">
            큰 목표를 숫자로 잡고, 아래 작은 실행을 반복해 하나씩 완성하세요.
          </p>
        </div>
        <Badge tone="brand">진행 중 {loops.filter((loop) => !loop.completedAt).length}개</Badge>
      </div>

      {loops.length === 0 ? (
        <Card className="border-dashed border-ink-300 bg-ink-50/50 text-center">
          <Icon name="loop" size={24} className="mx-auto text-ink-300" />
          <p className="mt-2 text-sm font-bold text-ink-700">첫 큰 루프를 열어보세요</p>
          <p className="mt-1 text-xs text-ink-400">
            비상금, 저축률, 월 현금흐름처럼 다음 3~12개월에 완성할 목표가 좋아요.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {loops.map((loop) => {
            const progress = getLoopProgress(
              loop,
              profile.snapshot,
              stage?.metrics,
              profile.tracking.routines,
            );
            const metric = LOOP_METRICS[loop.metric];
            return (
              <Card key={loop.id} className={progress.isComplete ? "border-sage-200 bg-sage-50/40" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-ink-800">{loop.title}</h3>
                      {progress.isComplete && <Badge tone="emerald">완성</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {metric.shortLabel} {progress.currentLabel} / {progress.targetLabel}
                      {loop.targetYears ? ` · ${loop.targetYears}년 안` : ""}
                    </p>
                  </div>
                  <Icon name={progress.isComplete ? "check-circle" : "target"} size={18} className={progress.isComplete ? "text-sage-600" : "text-gold-500"} />
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={progress.isComplete ? "h-full rounded-full bg-sage-500" : "h-full rounded-full bg-gold-400"}
                    style={{ width: `${Math.max(2, progress.pct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink-700">{progress.pct.toFixed(0)}%</span>
                  <span className="text-ink-400">작은 루프 {progress.smallLoopCount}개</span>
                </div>
                {loop.note && <p className="mt-3 text-xs leading-relaxed text-ink-500">{loop.note}</p>}
                <p className="mt-3 text-xs leading-relaxed text-ink-500">
                  {remainingLoopCopy(loop, progress)}
                </p>

                {loop.metric === "custom" && !progress.isComplete && (
                  <div className="mt-3">
                    <Field label="직접 기록한 진행">
                      <NumberInput
                        value={loop.manualProgressPct ?? 0}
                        onChange={(n) => updateGoalLoop(loop.id, { manualProgressPct: n })}
                        suffix="%"
                        showZero
                      />
                    </Field>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!progress.isComplete && (
                    <Link href={`/tracking?loop=${encodeURIComponent(loop.id)}`}>
                      <Button variant="outline" className="!py-1.5 !text-xs">
                        <Icon name="plus" size={13} /> 작은 루프 만들기
                      </Button>
                    </Link>
                  )}
                  {!progress.isComplete && (
                    <button
                      type="button"
                      onClick={() => {
                        completeGoalLoop(loop.id);
                        track("goal_loop_completed", { metric: loop.metric, source: "manual" });
                      }}
                      className="text-xs font-semibold text-sage-700 hover:underline"
                    >
                      완성 기록
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeGoalLoop(loop.id)}
                    className="ml-auto text-xs font-semibold text-ink-300 hover:text-red-500"
                  >
                    지우기
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-brand-200 bg-brand-50/35">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-800">
          <Icon name="plus" size={16} /> 큰 루프 추가
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="이 루프의 이름">
            <TextInput value={title} onChange={setTitle} placeholder="예: 비상금 3개월 만들기" />
          </Field>
          <Field label="측정 기준">
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseMetric(item)}
                  className={
                    metric === item
                      ? "rounded-lg border border-brand-500 bg-white px-2.5 py-2 text-xs font-bold text-brand-700"
                      : "rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-xs font-semibold text-ink-500 hover:border-brand-300"
                  }
                >
                  {LOOP_METRICS[item].shortLabel}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`목표 ${LOOP_METRICS[metric].shortLabel}`}>
            <NumberInput value={targetValue} onChange={setTargetValue} suffix={LOOP_METRICS[metric].unit} />
          </Field>
          <Field label="완성 시점" hint="선택">
            <NumberInput value={targetYears} onChange={setTargetYears} suffix="년 안" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="이 루프가 중요한 이유" hint="선택">
            <TextInput value={note} onChange={setNote} placeholder="예: 갑작스러운 지출에도 투자 루프를 끊지 않기 위해" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add} disabled={!title.trim() || targetValue <= 0}>
            큰 루프 열기 <Icon name="arrow-right" size={14} />
          </Button>
        </div>
      </Card>
    </section>
  );
}
