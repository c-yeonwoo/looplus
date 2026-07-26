"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProfile, MAX_SCENARIOS_LIMIT } from "@/lib/store/useProfile";
import { suggestEngineFromSnapshot, DEFAULT_SNAPSHOT } from "@/lib/store/defaults";
import {
  projectEngine,
  ratioSum,
  selectGoalState,
  adjustReturns,
  SENSITIVITY,
  childrenOf,
  collectDescendantIds,
  type SensitivityKey,
} from "@/lib/engine";
import type { Bucket, HoldingReturns } from "@/lib/types";
import {
  holdingsRealizedAnnual,
  resolveHoldingReturns,
  totalHoldings,
} from "@/lib/engine/holdings";
import { normalizeIncomeSources, sumMonthlyIncome } from "@/lib/income";
import { GROUP_PRESETS, bucketFromPreset } from "@/lib/catalog";
import { formatKRW } from "@/lib/format";
import { renderShareCard, shareOrDownload } from "@/lib/shareCard";
import { track, trackAhaAllocatedOnce, trackOncePerSession } from "@/lib/analytics";
import { GoalGuardTracker } from "@/components/GoalGuardTracker";
import { Card, Button, Badge, TextInput, AssumptionNote, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LeadCta } from "@/components/LeadCta";
import { AssetChart } from "@/components/AssetChart";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Palette } from "./Palette";
import { Inspector } from "./Inspector";
import { EngineCanvas } from "./EngineCanvas";
import {
  IncomeHubInspector,
  PoolHubInspector,
  SourceInspector,
} from "./HubInspector";
import {
  SpendRatioSuggestionBar,
  useSpendSuggestionPending,
} from "./SpendRatioSuggestion";
import { PushBudgetToVariableBar } from "./PushBudgetToVariable";
import { DiagnosisModal } from "./DiagnosisModal";

/** 월수입 게이트에 막힌 지점 — 어느 CTA에서 이탈하는지 구분한다 */
type IncomeGateSource = "empty_card" | "flat_banner" | "canvas_empty";

/** 보기 = 보드·결과 중심. 수정 = 팔레트·구조 편집. */
type EngineMode = "view" | "edit";

/**
 * lg 브레이크포인트(1024px) — 결과 카드가 탭 없이 보이는 폭인지.
 * 확정 전에는 null. 첫 렌더에 false 로 시작하면 데스크톱 열람이 mobile 로 기록된다.
 */
function useIsWide(): boolean | null {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

export function EngineBuilder() {
  const snapshot = useProfile((s) => s.profile.snapshot) ?? DEFAULT_SNAPSHOT;
  const vision = useProfile((s) => s.profile.vision);
  const engine = useProfile((s) => s.profile.engine);
  const buckets = engine.buckets;
  const scenarios = useProfile((s) => s.profile.scenarios);
  const addBucket = useProfile((s) => s.addBucket);
  const updateBucket = useProfile((s) => s.updateBucket);
  const removeBucket = useProfile((s) => s.removeBucket);
  const setBuckets = useProfile((s) => s.setBuckets);
  const setEngine = useProfile((s) => s.setEngine);
  const setSnapshot = useProfile((s) => s.setSnapshot);
  const saveScenario = useProfile((s) => s.saveScenario);
  const loadScenario = useProfile((s) => s.loadScenario);
  const deleteScenario = useProfile((s) => s.deleteScenario);

  const incomeSources = normalizeIncomeSources(snapshot.incomeSources);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds[0] ?? null;
  const selectNode = (
    id: string | null,
    opts?: { toggle?: boolean; also?: string[] },
  ) => {
    if (id == null) {
      setSelectedIds([]);
      return;
    }
    if (opts?.also?.length) {
      const uniq = [id, ...opts.also.filter((x) => x !== id)];
      setSelectedIds(uniq);
      return;
    }
    if (opts?.toggle) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      return;
    }
    setSelectedIds([id]);
  };
  const selectNodes = (ids: string[], opts?: { additive?: boolean }) => {
    if (opts?.additive) {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
      return;
    }
    setSelectedIds(ids);
  };
  const [compareId, setCompareId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [sens, setSens] = useState<SensitivityKey>("base");
  const [sharing, setSharing] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  /** 보드가 메인 — 모바일도 흐름 탭부터 */
  const [mobileTab, setMobileTab] = useState<"result" | "build">("build");
  const isWide = useIsWide();
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);
  /**
   * 배분이 없으면 무조건 수정(조립). 있으면 보기가 기본.
   * 세션 상태 — 토글할 때마다 클라우드에 올릴 이유가 없다.
   * persist 재수화 전에는 buckets 가 비어 보일 수 있어, hydration 뒤에 한 번만 초기화한다.
   */
  const hasHydrated = useProfile((s) => s.hasHydrated);
  const [mode, setMode] = useState<EngineMode>("view");
  const modeInited = useRef(false);
  useEffect(() => {
    if (!hasHydrated || modeInited.current) return;
    modeInited.current = true;
    setMode(buckets.length === 0 ? "edit" : "view");
  }, [hasHydrated, buckets.length]);
  useEffect(() => {
    if (buckets.length === 0 && mode !== "edit") setMode("edit");
  }, [buckets.length, mode]);
  const editing = mode === "edit" || buckets.length === 0;

  useEffect(() => {
    if (!editing) {
      setPaletteOpen(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setPaletteOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [editing]);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    hasKids: boolean;
  } | null>(null);

  const requestDelete = (id: string) => {
    const b = buckets.find((x) => x.id === id);
    if (!b) return;
    const hasKids = buckets.some((x) => x.parentId === id);
    setPendingDelete({ id, name: b.name, hasKids });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const drop = collectDescendantIds(pendingDelete.id, buckets);
    removeBucket(pendingDelete.id);
    setSelectedIds((cur) => cur.filter((id) => !drop.includes(id)));
    setPendingDelete(null);
  };

  const monthlyIncome = sumMonthlyIncome(incomeSources);
  const sum = ratioSum(buckets);
  const sumOk = Math.round(sum) === 100;
  /** 동기화 버그로 parentId가 사라진 평탄 트리 — 루트 합이 비정상적으로 큼 */
  const treeLooksFlatBroken =
    buckets.length >= 4 &&
    buckets.every((b) => !b.parentId) &&
    Math.round(sum) > 120;
  const spendSuggestionPending = useSpendSuggestionPending();

  const applyRecommendDraft = () => {
    const draft = suggestEngineFromSnapshot(snapshot);
    setEngine(draft);
    setPendingDraft(false);
    setMode("edit");
    setMobileTab("build");
    track("engine_recommend_applied", { source: "one_tap_aha" });
  };

  /**
   * 월수입이 0이면 배분할 대상이 없어 추천도 곡선도 만들 수 없다.
   * 이 사실을 버튼을 누른 뒤가 아니라 누르기 전에 알려준다 — 이전에는 "추천 배분으로
   * 시작"을 눌러도 말없이 현황 입력 모달이 떠서, 왜 곡선이 아닌 입력 폼이 나왔는지
   * 알 수 없었다.
   */
  const needsIncome = monthlyIncome <= 0;

  const startAha = (source: IncomeGateSource) => {
    if (needsIncome) {
      track("income_gate_blocked", { source });
      setDiagnosisOpen(true);
      return;
    }
    if (buckets.length > 0) setPendingDraft(true);
    else applyRecommendDraft();
  };

  const patchSources = (next: typeof incomeSources) => {
    setSnapshot({ ...snapshot, incomeSources: next });
  };

  const moveSibling = (id: string, dir: -1 | 1) => {
    const b = buckets.find((x) => x.id === id);
    if (!b) return;
    const sibs = childrenOf(b.parentId, buckets);
    const idx = sibs.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sibs.length) return;
    const reordered = [...sibs];
    [reordered[idx], reordered[j]] = [reordered[j]!, reordered[idx]!];
    const posMap = new Map(reordered.map((s, i) => [s.id, i]));
    setBuckets(buckets.map((x) => (posMap.has(x.id) ? { ...x, position: posMap.get(x.id)! } : x)));
  };

  const moveSourceSibling = (id: string, dir: -1 | 1) => {
    const sorted = [...incomeSources].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const idx = sorted.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[j]] = [reordered[j]!, reordered[idx]!];
    patchSources(reordered.map((s, i) => ({ ...s, position: i })));
  };

  useEffect(() => {
    if (sumOk && buckets.length > 0) {
      trackAhaAllocatedOnce({ bucket_count: buckets.length });
    }
  }, [sumOk, buckets.length]);

  const horizon = Math.max(vision?.targetYears ?? 15, 30);
  const holdingReturns = useMemo(
    () => resolveHoldingReturns(engine.holdingReturns),
    [engine.holdingReturns],
  );

  // 선택한 가정(보수/기본/공격)을 반영한 메인 곡선
  const projection = useMemo(
    () =>
      projectEngine({
        snapshot,
        buckets: adjustReturns(buckets, SENSITIVITY[sens].deltaPp),
        horizonYears: horizon,
        goalNetworth: vision?.goalNetworth,
        goalPassiveIncome: vision?.goalPassiveIncome,
        holdingReturns,
      }),
    [
      snapshot,
      buckets,
      sens,
      horizon,
      vision?.goalNetworth,
      vision?.goalPassiveIncome,
      holdingReturns,
    ],
  );

  // 민감도 밴드: 보수~공격 범위 (항상 표시)
  const band = useMemo(() => {
    const low = projectEngine({
      snapshot,
      buckets: adjustReturns(buckets, SENSITIVITY.conservative.deltaPp),
      horizonYears: horizon,
      goalNetworth: vision?.goalNetworth,
      holdingReturns,
    });
    const high = projectEngine({
      snapshot,
      buckets: adjustReturns(buckets, SENSITIVITY.aggressive.deltaPp),
      horizonYears: horizon,
      goalNetworth: vision?.goalNetworth,
      holdingReturns,
    });
    return { low, high };
  }, [snapshot, buckets, horizon, vision?.goalNetworth, holdingReturns]);

  const compareProjection = useMemo(() => {
    const sc = scenarios.find((x) => x.id === compareId);
    if (!sc) return null;
    return projectEngine({
      snapshot,
      buckets: sc.buckets,
      horizonYears: horizon,
      goalNetworth: vision?.goalNetworth,
      holdingReturns,
    });
  }, [compareId, scenarios, snapshot, horizon, vision?.goalNetworth, holdingReturns]);

  const selected = buckets.find((b) => b.id === selectedId) ?? null;
  const selectedSource =
    selectedId && !selected && selectedId !== "__income__" && selectedId !== "__pool__"
      ? incomeSources.find((s) => s.id === selectedId) ?? null
      : null;
  /**
   * 보유 자산에서 지금 나오는 현금흐름(월).
   * 프로젝션이 매년 자본소득으로 자동 재유입하므로 따로 수입원을 만들지 않는다.
   */
  const cashflowMonthly = useMemo(
    () => holdingsRealizedAnnual(snapshot, holdingReturns) / 12,
    [snapshot, holdingReturns],
  );
  const showIncomeSources = engine.showIncomeSources !== false;
  const setShowIncomeSources = (show: boolean) => {
    setEngine({ ...engine, showIncomeSources: show });
    if (
      !show &&
      selectedId &&
      incomeSources.some((s) => s.id === selectedId)
    ) {
      selectNode(null);
    }
  };
  const setHoldingReturns = (next: HoldingReturns) => {
    setEngine({ ...engine, holdingReturns: next });
  };
  const targetYears = vision?.targetYears ?? 15;
  const atYear = (curve: typeof projection.curve) =>
    curve.find((p) => p.year === targetYears) ?? curve[curve.length - 1];
  const atTarget = atYear(projection.curve);
  const lowAt = atYear(band.low.curve);
  const highAt = atYear(band.high.curve);

  const goal = selectGoalState(vision, projection);

  // 모바일은 탭으로 한쪽만 보여주므로, 결과 카드가 실제로 보일 때만 열람으로 센다.
  // isWide 가 확정될 때까지 기다린다 — 안 그러면 viewport 속성이 전부 mobile 이 된다.
  const resultOnScreen =
    isWide !== null && buckets.length > 0 && (isWide || mobileTab === "result");
  useEffect(() => {
    if (!resultOnScreen) return;
    trackOncePerSession("engine_result_viewed", "engine_result_viewed", {
      bucket_count: buckets.length,
      sum_pct: Math.round(sum),
      sum_ok: sumOk,
      has_numeric_goal: goal.hasNumericGoal,
      target_status: goal.targetStatus,
      sensitivity: sens,
      viewport: isWide ? "desktop" : "mobile",
    });
  }, [
    resultOnScreen,
    buckets.length,
    sum,
    sumOk,
    goal.hasNumericGoal,
    goal.targetStatus,
    sens,
    isWide,
  ]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await renderShareCard({
        curve: projection.curve,
        goalNetworth: vision?.goalNetworth,
        targetYears,
        atTargetNetWorth: atTarget.totalNetWorth,
        lowNetWorth: lowAt.totalNetWorth,
        highNetWorth: highAt.totalNetWorth,
        targetReachYear: projection.targetReachYear,
        targetStatus: projection.targetStatus,
        achievementPct: projection.achievementPct,
      });
      await shareOrDownload(blob);
      track("share_card_shared", {
        target_years: targetYears,
        achievement_pct: Math.round(projection.achievementPct),
      });
      setJustShared(true);
    } catch (e) {
      console.error("[share]", e);
    } finally {
      setSharing(false);
    }
  };

  const duplicate = (b: Bucket) => {
    const id = `b_${buckets.length}_${Math.random().toString(36).slice(2, 8)}`;
    const pos = childrenOf(b.parentId, buckets).length;
    addBucket({ ...b, id, name: `${b.name} 복제`, position: pos, parentId: b.parentId ?? null });
  };

  return (
    <div className="space-y-5">
      {/* 상단바 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
          <Button
            variant="outline"
            className="!px-3 !py-1.5 text-sm"
            onClick={() => setDiagnosisOpen(true)}
          >
            <Icon name="diagnosis" size={15} />
            내 현황
          </Button>
          {vision && (
            <span className="flex items-center gap-1.5 font-semibold">
              <Icon name="target" size={16} className="text-brand-600" />
              {goal.hasNumericGoal ? (
                <>
                  목표 {formatKRW(vision.goalNetworth)} · {vision.targetYears}년 뒤
                </>
              ) : (
                <Link href="/goals" className="underline decoration-dotted">
                  목표 미설정
                </Link>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {buckets.length > 0 && (
            <div
              className="flex rounded-lg border border-ink-200 bg-ink-50 p-0.5 text-xs"
              role="group"
              aria-label="엔진 모드"
            >
              <button
                type="button"
                onClick={() => setMode("view")}
                className={
                  !editing
                    ? "rounded-md bg-white px-2.5 py-1.5 font-semibold text-ink-800 shadow-sm"
                    : "px-2.5 py-1.5 font-semibold text-ink-500"
                }
              >
                현황 보기
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={
                  editing
                    ? "rounded-md bg-white px-2.5 py-1.5 font-semibold text-ink-800 shadow-sm"
                    : "px-2.5 py-1.5 font-semibold text-ink-500"
                }
              >
                배분 수정
              </button>
            </div>
          )}
          <Badge tone={sumOk ? "emerald" : "amber"}>
            수입 배분 {Math.round(sum)}% {sumOk ? "✓" : "(루트 합 100%)"}
          </Badge>
        </div>
      </div>

      {treeLooksFlatBroken && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          배분 트리가 평탄화되어 합이 {Math.round(sum)}%로 보여요.{" "}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => startAha("flat_banner")}
          >
            {needsIncome ? "월수입 입력하기" : "추천 배분으로 다시 잡기"}
          </button>
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-ink-200 bg-ink-50 p-0.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("build")}
          className={
            mobileTab === "build"
              ? "flex-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm"
              : "flex-1 px-3 py-1.5 text-xs font-semibold text-ink-500"
          }
        >
          흐름
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("result")}
          className={
            mobileTab === "result"
              ? "flex-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm"
              : "flex-1 px-3 py-1.5 text-xs font-semibold text-ink-500"
          }
        >
          결과
        </button>
      </div>

      {buckets.length === 0 && (
        <Card className="border-gold-200 bg-gold-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-ink-900">
                {needsIncome ? "월수입을 먼저 알려주세요" : "3분 만에 내 곡선 보기"}
              </div>
              <p className="mt-1 text-xs text-ink-600">
                {needsIncome
                  ? "나눌 돈이 정해져야 추천 배분과 곡선을 만들 수 있어요."
                  : "현황을 넣고 추천 배분을 적용하면 바로 그래프가 그려져요."}
              </p>
            </div>
            <Button onClick={() => startAha("empty_card")}>
              {needsIncome ? "월수입 입력" : "추천 배분으로 시작"}
            </Button>
          </div>
        </Card>
      )}

      <DiagnosisModal open={diagnosisOpen} onClose={() => setDiagnosisOpen(false)} />
      <ConfirmModal
        open={pendingDraft}
        title="추천 배분으로 다시 그릴까요?"
        message="현재 캔버스의 배분 트리를 추천 초안으로 바꿉니다."
        confirmLabel="적용"
        danger={false}
        onCancel={() => setPendingDraft(false)}
        onConfirm={applyRecommendDraft}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* 항목 추가 — 배분 수정 모드에서만 */}
        {editing && (
          <div className={mobileTab === "result" ? "hidden lg:block" : undefined}>
            {paletteOpen ? (
              <Card pad={false} className="shrink-0 lg:w-[200px]">
                <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2.5">
                  <span className="text-sm font-bold text-ink-800">항목 추가</span>
                  <button
                    onClick={() => setPaletteOpen(false)}
                    aria-label="접기"
                    className="text-ink-400 hover:text-ink-700"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
                <div className="p-3">
                  <Palette
                    buckets={buckets}
                    selectedId={selected && selectedId ? selectedId : null}
                    incomeCount={incomeSources.length}
                    onAdd={addBucket}
                    onAddIncome={(s) => {
                      patchSources([...incomeSources, s]);
                      if (s.id) selectNode(s.id);
                    }}
                  />
                </div>
              </Card>
            ) : (
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                <Icon name="plus" size={16} /> 항목 추가
              </button>
            )}
          </div>
        )}

        {/*
          보드가 메인, 결과는 그 아래.
          모바일은 탭으로 하나만. 데스크톱은 DOM 순서 = 시각 순서.
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {editing && buckets.length > 0 && (
            <div
              className={
                mobileTab === "result" ? "hidden space-y-2 lg:block" : "space-y-2"
              }
            >
              <SpendRatioSuggestionBar />
              <PushBudgetToVariableBar />
            </div>
          )}
          <div className={mobileTab === "result" ? "hidden lg:block" : undefined}>
          <EngineCanvas
            buckets={buckets}
            engine={engine}
            incomeSources={incomeSources}
            selectedIds={selectedIds}
            onSelect={selectNode}
            onAdd={addBucket}
            onRequestDelete={requestDelete}
            spendSuggestionPending={spendSuggestionPending}
            cashflowMonthly={cashflowMonthly}
            holdingsTotal={totalHoldings(snapshot)}
            editable={editing}
            onOpenDiagnosis={() => setDiagnosisOpen(true)}
            onShowIncomeSourcesChange={setShowIncomeSources}
            onMoveNodes={(moves) => {
              const byId = new Map(moves.map((m) => [m.id, m]));
              let nextEngine = { ...engine };
              let engineTouched = false;
              const incomeMove = byId.get("__income__");
              if (incomeMove) {
                nextEngine = {
                  ...nextEngine,
                  incomeCanvasX: incomeMove.x,
                  incomeCanvasY: incomeMove.y,
                };
                engineTouched = true;
              }
              const poolMove = byId.get("__pool__");
              if (poolMove) {
                nextEngine = {
                  ...nextEngine,
                  poolCanvasX: poolMove.x,
                  poolCanvasY: poolMove.y,
                };
                engineTouched = true;
              }
              let sourcesTouched = false;
              const nextSources = incomeSources.map((s) => {
                if (!s.id) return s;
                const m = byId.get(s.id);
                if (!m) return s;
                sourcesTouched = true;
                return { ...s, canvasX: m.x, canvasY: m.y };
              });
              const nextBuckets = buckets.map((b) => {
                const m = byId.get(b.id);
                return m ? { ...b, canvasX: m.x, canvasY: m.y } : b;
              });
              const bucketsTouched = nextBuckets.some(
                (b, i) => b.canvasX !== buckets[i]?.canvasX || b.canvasY !== buckets[i]?.canvasY,
              );
              if (engineTouched || bucketsTouched) {
                setEngine({
                  ...nextEngine,
                  buckets: bucketsTouched ? nextBuckets : nextEngine.buckets,
                });
              }
              if (sourcesTouched) patchSources(nextSources);
            }}
            onEdgeControl={(edgeId, point) => {
              const prev = engine.edgeControls ?? {};
              if (point == null) {
                const { [edgeId]: _, ...rest } = prev;
                setEngine({ ...engine, edgeControls: rest });
                return;
              }
              setEngine({
                ...engine,
                edgeControls: { ...prev, [edgeId]: point },
              });
            }}
            onSelectIds={selectNodes}
            onResetLayout={() => {
              setEngine({
                ...engine,
                buckets: buckets.map((b) => ({ ...b, canvasX: null, canvasY: null })),
                incomeCanvasX: null,
                incomeCanvasY: null,
                poolCanvasX: null,
                poolCanvasY: null,
                edgeControls: {},
              });
              patchSources(
                incomeSources.map((s) => ({ ...s, canvasX: null, canvasY: null })),
              );
            }}
            canRecommend={!needsIncome}
            onRecommend={() => {
              // 캔버스 빈 상태의 추천도 같은 게이트를 지난다 (여기만 우회하면 0원을
              // 배분한 평평한 곡선이 '결과'로 나온다)
              if (needsIncome) {
                track("income_gate_blocked", { source: "canvas_empty" });
                setDiagnosisOpen(true);
                return;
              }
              setEngine(suggestEngineFromSnapshot(snapshot));
              track("engine_recommend_applied", { source: "canvas_empty" });
            }}
          />
          </div>

          <Card
            className={mobileTab === "build" ? "hidden lg:block" : undefined}
          >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink-800">
            <Icon name="trending-up" size={16} className="text-gold-500" />
            예상 결과
          </div>
          <div className="flex items-center gap-2">
            {compareId && (
              <Badge tone="slate">
                점선 = {scenarios.find((s) => s.id === compareId)?.name} 비교
              </Badge>
            )}
            {/* 수익률 가정 프리셋 */}
            <div className="flex rounded-lg border border-ink-200 p-0.5 text-xs">
              {(["conservative", "base", "aggressive"] as SensitivityKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSens(k);
                    track("sensitivity_changed", { sensitivity: k });
                  }}
                  className={
                    "rounded-md px-2.5 py-1 font-semibold transition-colors " +
                    (sens === k
                      ? "bg-sage-500 text-white"
                      : "text-ink-500 hover:bg-ink-100")
                  }
                >
                  {SENSITIVITY[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mb-3 text-xs text-ink-400">
          {SENSITIVITY[sens].label} = 기대수익률{" "}
          {SENSITIVITY[sens].deltaPp > 0 ? "+" : ""}
          {SENSITIVITY[sens].deltaPp}%p · 띠는 보수(−3)~공격(+3) 범위
        </p>

        {goal.showRealityNudge && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Icon name="info" size={16} className="mt-0.5 shrink-0" />
            <span>
              이 속도면 {targetYears}년 안에 목표 도달이 어려울 수 있어요. 저축을 늘리거나 목표
              시점을 늦춰 보세요.
            </span>
          </div>
        )}

        {goal.guardCopy && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-50 px-3 py-2.5">
            <GoalGuardTracker surface="engine" />
            <div className="flex items-start gap-2 text-sm text-gold-700">
              <Icon name="target" size={16} className="mt-0.5 shrink-0" />
              <span>{goal.guardCopy.short}</span>
            </div>
            <Link href="/goals" className="shrink-0">
              <Button className="!py-1.5 !text-xs">
                목표 정하기 <Icon name="arrow-right" size={14} />
              </Button>
            </Link>
          </div>
        )}

        {/*
          곡선을 숫자 옆에 두지 않는다. 팔레트(200px)와 항목 수정(280px) 사이드바 때문에
          이 가운데 칼럼은 1440px 화면에서도 566px뿐이어서, 고정 300px 숫자 칼럼과
          나누면 정작 주인공인 곡선이 246px로 눌렸다. 숫자를 아래로 내려 곡선에 폭을 준다.
        */}
        <div className="space-y-4">
          <AssetChart
            curve={projection.curve}
            compareCurve={compareProjection?.curve ?? null}
            band={{ lower: band.low.curve, upper: band.high.curve }}
            goalNetworth={vision?.goalNetworth}
            targetReachYear={projection.targetReachYear}
            height={260}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={`${targetYears}년 뒤 예상 순자산`}
              value={formatKRW(atTarget.totalNetWorth)}
              sub={`범위 ${formatKRW(lowAt.totalNetWorth)} ~ ${formatKRW(highAt.totalNetWorth)}`}
            />
            <StatCard label="목표 도달까지" value={goal.reachLabel} sub={goal.reachSub} />
            <StatCard
              label={`${targetYears}년 뒤 월 passive`}
              value={formatKRW(atTarget.monthlyPassiveIncome)}
              sub={
                projection.crossoverYear != null
                  ? `${projection.crossoverYear}년 뒤 자본>근로 역전`
                  : "실현 자본소득"
              }
            />
          </div>
        </div>

        {/* 아하 → 공유 → 리드 */}
        {sumOk && (
          <div className="mt-4 space-y-3 rounded-xl border border-ink-200 bg-ink-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink-800">배분이 맞춰졌어요</div>
                <p className="text-xs text-ink-500">
                  결과를 공유한 뒤, 실행 가이드로 이어가 보세요.
                </p>
              </div>
              <Button onClick={handleShare} disabled={sharing}>
                <Icon name="image" size={15} /> {sharing ? "생성 중…" : "결과 공유"}
              </Button>
            </div>
            <LeadCta
              placement={justShared ? "engine_after_share" : "engine_result"}
            />
          </div>
        )}

        {/* 시나리오 */}
        <div className="mt-4 border-t border-ink-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-600">시나리오</span>
            <div className="w-40">
              <TextInput value={scenarioName} onChange={setScenarioName} placeholder="이름 (예: 공격형)" />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                saveScenario(scenarioName);
                track("scenario_saved", { scenario_count: scenarios.length + 1 });
                setScenarioName("");
              }}
              disabled={buckets.length === 0 || scenarios.length >= MAX_SCENARIOS_LIMIT}
            >
              현재 배분 저장
            </Button>
            <span className="text-xs text-ink-400">
              {scenarios.length}/{MAX_SCENARIOS_LIMIT}
            </span>
            {!sumOk && (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={handleShare}
                disabled={buckets.length === 0 || sharing}
              >
                <Icon name="image" size={15} /> {sharing ? "생성 중…" : "결과 공유"}
              </Button>
            )}
          </div>
          {scenarios.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-1 text-xs"
                >
                  <span className="font-medium text-ink-600">{sc.name}</span>
                  <button className="text-brand-600" onClick={() => loadScenario(sc.id)}>
                    불러오기
                  </button>
                  <button
                    className={compareId === sc.id ? "text-ink-800 font-bold" : "text-ink-400"}
                    onClick={() => setCompareId(compareId === sc.id ? null : sc.id)}
                  >
                    비교
                  </button>
                  <button
                    className="text-red-400"
                    onClick={() => deleteScenario(sc.id)}
                    aria-label="시나리오 삭제"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

          <div className="mt-3">
            <AssumptionNote />
          </div>
          </Card>
        </div>

        {/* 항목 패널 — 보기에서도 숫자 확인·미세 조정용으로 유지 */}
        <Card
          pad={false}
          className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-[280px] shrink-0 overflow-y-auto border-ink-200 lg:block"
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2.5">
            <span className="text-sm font-bold text-ink-800">
              {editing ? "항목 수정" : "항목"}
            </span>
            {selectedId && (
              <button
                onClick={() => selectNode(null)}
                aria-label="선택 해제"
                className="text-ink-400 hover:text-ink-700"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
          <div className="p-3">
            {!editing && !selectedId && selectedIds.length <= 1 && (
              <div className="mb-3 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                노드를 누르면 숫자를 볼 수 있어요. 항목을 더하거나 옮기려면{" "}
                <button
                  type="button"
                  className="font-semibold text-brand-700 underline"
                  onClick={() => setMode("edit")}
                >
                  배분 수정
                </button>
                .
              </div>
            )}
            {selectedId === "__income__" ? (
              <IncomeHubInspector
                monthlyIncome={monthlyIncome}
                showIncomeSources={showIncomeSources}
                onShowIncomeSourcesChange={setShowIncomeSources}
                structureEditable={editing}
                onAddGroup={() => {
                  const pos = childrenOf(null, buckets).length;
                  addBucket(bucketFromPreset(GROUP_PRESETS[0]!, pos, null));
                }}
              />
            ) : selectedId === "__pool__" ? (
              <PoolHubInspector
                snapshot={snapshot}
                returns={holdingReturns}
                onChangeSnapshot={(patch) => setSnapshot({ ...snapshot, ...patch })}
                onChangeReturns={setHoldingReturns}
                onOpenDiagnosis={() => setDiagnosisOpen(true)}
              />
            ) : selectedSource ? (
              <SourceInspector
                source={selectedSource}
                structureEditable={editing}
                onChange={(patch) =>
                  patchSources(
                    incomeSources.map((s) =>
                      s.id === selectedSource.id ? { ...s, ...patch } : s,
                    ),
                  )
                }
                onDelete={() => {
                  patchSources(incomeSources.filter((s) => s.id !== selectedSource.id));
                  selectNode(null);
                }}
                onMoveSibling={(dir) => moveSourceSibling(selectedSource.id!, dir)}
              />
            ) : selected ? (
              <>
                <Inspector
                  bucket={selected}
                  all={buckets}
                  monthlyIncome={monthlyIncome}
                  structureEditable={editing}
                  onChange={(patch) => updateBucket(selected.id, patch)}
                  onDelete={() => requestDelete(selected.id)}
                  onDuplicate={() => duplicate(selected)}
                  onMoveSibling={(dir) => moveSibling(selected.id, dir)}
                />
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
                    sumOk
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  월수입 대비 루트 {Math.round(sum)}%{" "}
                  {sumOk ? "" : sum > 100 ? "· 초과" : "· 미달"}
                </div>
              </>
            ) : selectedIds.length > 1 ? (
              <div className="px-2 py-8 text-center text-sm text-ink-500">
                {selectedIds.length}개 선택
                {editing ? " · 드래그하면 함께 움직여요" : ""}
              </div>
            ) : (
              <div className="flex flex-col items-center px-2 py-10 text-center">
                <Icon name="layers" size={28} className="text-ink-300" />
                <p className="mt-3 text-sm font-semibold text-ink-600">노드를 선택하세요</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  월수입 · 자산 · 투자/저축/지출
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <BottomSheet
        open={selectedId !== null}
        onClose={() => selectNode(null)}
        title={editing ? "항목 수정" : "항목"}
      >
        {selectedId === "__income__" && (
          <IncomeHubInspector
            monthlyIncome={monthlyIncome}
            showIncomeSources={showIncomeSources}
            onShowIncomeSourcesChange={setShowIncomeSources}
            structureEditable={editing}
            onAddGroup={() => {
              const pos = childrenOf(null, buckets).length;
              addBucket(bucketFromPreset(GROUP_PRESETS[0]!, pos, null));
            }}
          />
        )}
        {selectedId === "__pool__" && (
          <PoolHubInspector
            snapshot={snapshot}
            returns={holdingReturns}
            onChangeSnapshot={(patch) => setSnapshot({ ...snapshot, ...patch })}
            onChangeReturns={setHoldingReturns}
            onOpenDiagnosis={() => setDiagnosisOpen(true)}
          />
        )}
        {selectedSource && (
          <SourceInspector
            source={selectedSource}
            structureEditable={editing}
            onChange={(patch) =>
              patchSources(
                incomeSources.map((s) =>
                  s.id === selectedSource.id ? { ...s, ...patch } : s,
                ),
              )
            }
            onDelete={() => {
              patchSources(incomeSources.filter((s) => s.id !== selectedSource.id));
              selectNode(null);
            }}
            onMoveSibling={(dir) => moveSourceSibling(selectedSource.id!, dir)}
          />
        )}
        {selected && (
          <Inspector
            bucket={selected}
            all={buckets}
            monthlyIncome={monthlyIncome}
            structureEditable={editing}
            onChange={(patch) => updateBucket(selected.id, patch)}
            onDelete={() => requestDelete(selected.id)}
            onDuplicate={() => duplicate(selected)}
            onMoveSibling={(dir) => moveSibling(selected.id, dir)}
          />
        )}
      </BottomSheet>

      <ConfirmModal
        open={pendingDelete !== null}
        title="항목 삭제"
        message={
          pendingDelete?.hasKids
            ? `"${pendingDelete.name}"과 하위 항목을 모두 삭제할까요?`
            : `"${pendingDelete?.name ?? ""}" 항목을 삭제할까요?`
        }
        confirmLabel="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
