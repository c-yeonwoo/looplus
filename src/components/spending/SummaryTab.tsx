"use client";

import { useMemo, useState } from "react";
import { useProfile, selectSpending } from "@/lib/store/useProfile";
import {
  budgetPace,
  categoryBreakdown,
  logsInMonth,
  peerInsight,
  patternInsight,
  sumFixed,
  sumLogs,
} from "@/lib/spending/calc";
import { formatWon, formatWonFull } from "@/lib/spending/format";
import { AssumptionNote, Button, Card, NumberInput } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { DonutChart } from "./DonutChart";
import { clsx } from "@/lib/clsx";

export function SummaryTab() {
  const profile = useProfile((s) => s.profile);
  const setVariableBudget = useProfile((s) => s.setVariableBudget);
  const spending = selectSpending(profile);
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const monthLogs = useMemo(
    () => logsInMonth(spending.logs, year, monthIndex),
    [spending.logs, year, monthIndex],
  );
  const spent = sumLogs(monthLogs);
  const fixedTotal = sumFixed(spending.fixed);
  const breakdown = categoryBreakdown(monthLogs);
  const pace = budgetPace({
    spentWon: spent,
    budgetWon: spending.monthlyVariableBudgetWon,
    year,
    monthIndex,
  });
  const peer = peerInsight(breakdown, profile.vision?.currentAge);
  const pattern = patternInsight(monthLogs);
  const incomeWon =
    (profile.snapshot?.incomeSources.reduce((s, i) => s + i.monthly, 0) ?? 0) * 10_000;
  const fixedIncomePct = incomeWon > 0 ? (fixedTotal / incomeWon) * 100 : null;

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(spending.monthlyVariableBudgetWon / 10_000);

  return (
    <div className="space-y-5">
      {/* 예산 히어로 — Quiet Ledger: charcoal 면 + bronze 진행 */}
      <section className="overflow-hidden rounded-2xl border border-brand-800/10 bg-brand-900 text-white">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-white/50">이번 달 변동 지출</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="tnum font-display text-3xl font-bold text-gold-400">
                  {formatWon(spent)}
                </span>
                <span className="tnum text-lg text-white/50">
                  / {formatWon(spending.monthlyVariableBudgetWon)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBudgetDraft(spending.monthlyVariableBudgetWon / 10_000);
                setEditingBudget((v) => !v);
              }}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
            >
              예산 수정
            </button>
          </div>

          {editingBudget && (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-white/5 p-3">
              <div className="w-36">
                <NumberInput value={budgetDraft} onChange={setBudgetDraft} />
              </div>
              <span className="pb-2 text-xs text-white/50">만원</span>
              <Button
                onClick={() => {
                  setVariableBudget(Math.round(budgetDraft * 10_000));
                  setEditingBudget(false);
                }}
              >
                저장
              </Button>
            </div>
          )}

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  pace.usedPct > 100 ? "bg-red-400" : "bg-gold-400",
                )}
                style={{ width: `${Math.min(100, pace.usedPct)}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-white/55">
              <span>
                {pace.daysLeft}일 남음 · 하루 약 {formatWon(Math.max(0, pace.dailyRoomWon))} 여유
              </span>
              <span className="tnum">남은 {formatWon(Math.max(0, pace.remainingWon))}</span>
            </div>
            <p
              className={clsx(
                "mt-2 text-sm",
                pace.overPace ? "text-amber-200" : "text-white/70",
              )}
            >
              {pace.overPace
                ? `이 페이스면 월말 예산 약 ${pace.projectedPct.toFixed(0)}% 소진 예상이에요.`
                : `예산 ${pace.usedPct.toFixed(0)}% 사용 · 이 페이스면 월말 약 ${formatWon(pace.projectedWon)}.`}
            </p>
          </div>
        </div>
      </section>

      {/* 고정 vs 변동 프레이밍 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="!p-4">
          <div className="text-xs font-semibold text-ink-400">고정비</div>
          <div className="tnum mt-1 text-xl font-extrabold text-ink-900">
            {formatWon(fixedTotal)}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {fixedIncomePct != null
              ? `소득 대비 ${fixedIncomePct.toFixed(0)}% · 결제일만 관리`
              : "진단에서 소득을 넣으면 비중을 보여줘요"}
          </p>
        </Card>
        <Card className="!p-4 border-gold-200 bg-gold-50/40">
          <div className="text-xs font-semibold text-gold-600">변동비</div>
          <div className="tnum mt-1 text-xl font-extrabold text-ink-900">{formatWon(spent)}</div>
          <p className="mt-1 text-xs text-ink-500">
            예산 {formatWonFull(spending.monthlyVariableBudgetWon)} 안에서 기록·조절
          </p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-bold text-ink-800">카테고리별 변동지출</div>
          <DonutChart segments={breakdown} totalWon={spent} />
        </Card>

        <div className="space-y-3">
          <div className="text-sm font-bold text-ink-800">진단</div>
          {peer && (
            <div
              className={clsx(
                "rounded-xl border px-4 py-3",
                peer.tone === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : "border-ink-200 bg-ink-50",
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  name={peer.tone === "warning" ? "alert" : "info"}
                  size={16}
                  className={peer.tone === "warning" ? "text-amber-700" : "text-ink-500"}
                />
                <div>
                  <div className="text-sm font-bold text-ink-800">{peer.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{peer.body}</p>
                </div>
              </div>
            </div>
          )}
          {pattern && (
            <div className="rounded-xl border border-sage-100 bg-sage-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Icon name="sparkle" size={16} className="text-sage-600" />
                <div>
                  <div className="text-sm font-bold text-sage-700">{pattern.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-sage-700/90">{pattern.body}</p>
                </div>
              </div>
            </div>
          )}
          {!peer && !pattern && (
            <Card className="!p-4 text-sm text-ink-500">
              변동 지출을 몇 건 기록하면 또래·패턴 진단이 나타납니다.
            </Card>
          )}
          <AssumptionNote>
            또래 비교는 연령대 집단 평균의 <strong>예시·가정</strong>입니다. 개별 종목·매물 추천이
            아닙니다.
          </AssumptionNote>
        </div>
      </div>
    </div>
  );
}
