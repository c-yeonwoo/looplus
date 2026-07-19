"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bucket, BucketCategory } from "@/lib/types";
import {
  GROUP_PRESETS,
  ITEM_PRESETS,
  bucketFromPreset,
  customBucket,
  presetByKey,
  type BucketPreset,
} from "@/lib/catalog";
import {
  childrenOf,
  isLeaf,
  monthlyManwon,
  pathToRoot,
  ratioOfTotal,
} from "@/lib/engine/tree";
import {
  edgePath,
  layoutEngineGraph,
  type GraphNode,
} from "@/lib/engine/layout";
import { Button, EmptyState, TextInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

const CAT_NODE: Record<string, string> = {
  invest: "border-invest-500 bg-invest-50 text-invest-700",
  save: "border-save-500 bg-save-50 text-save-700",
  spend: "border-spend-500 bg-spend-50 text-spend-700",
};

function linkWidth(ratio: number) {
  return 1.4 + (Math.max(0, Math.min(100, ratio)) / 100) * 7;
}

function QuickAddMenu({
  parentId,
  parent,
  buckets,
  onAdd,
  onClose,
}: {
  parentId: string | null;
  parent: Bucket | null;
  buckets: Bucket[];
  onAdd: (b: Bucket) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = useState("");
  const underIncome = parentId === null;
  const cat: BucketCategory = parent?.category ?? "invest";
  const presets: BucketPreset[] = underIncome
    ? GROUP_PRESETS
    : ITEM_PRESETS.filter((p) => p.category === cat);

  const add = (p: BucketPreset) => {
    const pid = underIncome ? null : parentId;
    const pos = childrenOf(pid, buckets).length;
    onAdd(bucketFromPreset(p, pos, pid));
    onClose();
  };

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 mx-auto max-w-md rounded-xl border border-ink-200 bg-white p-3 shadow-lg sm:left-auto sm:right-3 sm:w-72">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-bold text-ink-800">
          {underIncome ? "수입 아래에 묶음 추가" : `"${parent?.name}" 아래에 추가`}
        </div>
        <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700" aria-label="닫기">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => add(p)}
            className="flex items-center gap-2 rounded-lg border border-ink-100 px-2.5 py-2 text-left text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Icon name={p.icon} size={16} />
            {p.name}
          </button>
        ))}
      </div>
      {!underIncome && (
        <div className="mt-2 border-t border-ink-100 pt-2">
          <TextInput value={customName} onChange={setCustomName} placeholder="직접 이름" />
          <Button
            className="mt-2 w-full"
            disabled={!customName.trim()}
            onClick={() => {
              const pos = childrenOf(parentId, buckets).length;
              onAdd(customBucket(cat, customName.trim(), pos, parentId));
              onClose();
            }}
          >
            추가
          </Button>
        </div>
      )}
    </div>
  );
}

export function EngineCanvas({
  buckets,
  monthlyIncome,
  selectedId,
  onSelect,
  onAdd,
  onRequestDelete,
  onRecommend,
}: {
  buckets: Bucket[];
  monthlyIncome: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (b: Bucket) => void;
  onRequestDelete: (id: string) => void;
  onRecommend: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [quickAddParent, setQuickAddParent] = useState<string | null | undefined>(undefined);
  // undefined = closed, null = under income, string = under bucket

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAnimate(!mq.matches);
    const on = () => setAnimate(!mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const { nodes, edges, width, height } = useMemo(
    () =>
      layoutEngineGraph(buckets, {
        addUnderId: selectedId && buckets.some((b) => b.id === selectedId) ? selectedId : null,
      }),
    [buckets, selectedId],
  );

  const byId = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const crumb = selectedId ? pathToRoot(selectedId, buckets) : [];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const key = e.dataTransfer.getData("application/bucket-preset");
    const preset = presetByKey(key);
    if (!preset) return;
    const parentId =
      preset.kind === "group"
        ? null
        : selectedId && buckets.some((b) => b.id === selectedId)
          ? selectedId
          : null;
    const siblings = childrenOf(parentId, buckets);
    onAdd(bucketFromPreset(preset, siblings.length, parentId));
  };

  if (buckets.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-[420px] items-center justify-center rounded-xl border bg-white ${
          dragOver ? "border-2 border-dashed border-brand-400 bg-brand-50/40" : "border-ink-200"
        }`}
      >
        <EmptyState
          icon="layers"
          title="노드를 추가해 배분 트리를 만드세요"
          desc="수입에서 시작해 묶음·세부 항목을 왼→오른쪽으로 뻗어 나갑니다."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={onRecommend}>추천 배분으로 시작</Button>
              <Button variant="outline" onClick={() => setQuickAddParent(null)}>
                묶음부터 추가
              </Button>
            </div>
          }
        />
        {quickAddParent !== undefined && (
          <QuickAddMenu
            parentId={quickAddParent}
            parent={null}
            buckets={buckets}
            onAdd={onAdd}
            onClose={() => setQuickAddParent(undefined)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border bg-white transition-colors ${
        dragOver ? "border-2 border-dashed border-brand-400 bg-brand-50/40" : "border-ink-200"
      }`}
    >
      {/* 브레드크럼 — 마인드맵 포커스 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-md px-1.5 py-0.5 font-semibold text-brand-600 hover:bg-brand-50"
        >
          월 수입
        </button>
        {crumb.map((b) => (
          <span key={b.id} className="flex items-center gap-1">
            <Icon name="chevron-right" size={12} className="text-ink-300" />
            <button
              type="button"
              onClick={() => onSelect(b.id)}
              className={`rounded-md px-1.5 py-0.5 font-semibold ${
                b.id === selectedId ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              {b.name}
            </button>
          </span>
        ))}
        <span className="ml-auto tnum font-semibold text-ink-500">월 {monthlyIncome}만</span>
      </div>

      <div className="overflow-x-auto p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[720px]"
          style={{ height: "auto", aspectRatio: `${width} / ${height}` }}
        >
          <text
            x={width / 2}
            y={18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--color-brand-500)"
          >
            배당·이자 등 → 다시 수입으로
          </text>

          {edges.map((e, i) => {
            const from = byId.get(e.fromId);
            const to = byId.get(e.toId);
            if (!from || !to) return null;
            const reinvest = e.fromId === "__pool__" && e.toId === "__income__";
            const d = edgePath(from, to, { reinvest });
            const pid = `edge-${e.id}`;
            const stroke =
              e.tone === "spend"
                ? "var(--color-spend-400)"
                : e.tone === "dashed"
                  ? "var(--color-brand-300)"
                  : "var(--color-brand-300)";
            return (
              <g key={e.id}>
                <path
                  id={pid}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={e.tone === "dashed" ? 1.4 : linkWidth(e.ratio)}
                  strokeDasharray={e.tone === "dashed" ? "5 5" : undefined}
                  opacity={0.75}
                />
                {animate && e.tone !== "dashed" && e.ratio > 0 && (
                  <>
                    <path
                      d={d}
                      fill="none"
                      stroke={e.tone === "spend" ? "var(--color-spend-500)" : "var(--color-brand-500)"}
                      strokeWidth="1.5"
                      strokeDasharray="2 10"
                      strokeLinecap="round"
                      className="flow-link"
                      opacity="0.85"
                    />
                    <circle r="3" fill="var(--color-gold-400)">
                      <animateMotion
                        dur={`${2.2 - Math.min(1, e.ratio / 120)}s`}
                        repeatCount="indefinite"
                        begin={`${(i % 5) * 0.25}s`}
                      >
                        <mpath href={`#${pid}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {nodes.map((n) => {
            if (n.kind === "income") {
              return (
                <foreignObject key={n.id} x={n.x} y={n.y} width={n.w} height={n.h}>
                  <div className="flex h-full flex-col justify-center rounded-xl border border-brand-200 bg-brand-50 px-2 text-center">
                    <div className="text-[11px] font-semibold text-brand-600">월 수입</div>
                    <div className="tnum mt-0.5 text-sm font-extrabold text-brand-800">
                      {monthlyIncome}만
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickAddParent(null)}
                      className="mx-auto mt-1.5 flex items-center gap-0.5 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 hover:bg-white"
                    >
                      <Icon name="plus" size={11} /> 묶음
                    </button>
                  </div>
                </foreignObject>
              );
            }
            if (n.kind === "pool") {
              return (
                <foreignObject key={n.id} x={n.x} y={n.y} width={n.w} height={n.h}>
                  <div className="flex h-full flex-col items-center justify-center rounded-xl bg-brand-800 px-2 text-center text-white">
                    <div className="text-sm font-bold">모인 자산</div>
                    <div className="mt-0.5 text-[10px] opacity-80">복리 누적</div>
                    <div className="mt-1.5 text-[9px] leading-relaxed opacity-65">
                      미실현 = 내부
                      <br />
                      실현 = 재유입
                    </div>
                  </div>
                </foreignObject>
              );
            }
            if (n.kind === "add") {
              const parentId = selectedId!;
              return (
                <foreignObject key={n.id} x={n.x} y={n.y} width={n.w} height={n.h}>
                  <button
                    type="button"
                    onClick={() => setQuickAddParent(parentId)}
                    className="flex h-full w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-xs font-bold text-brand-600 hover:bg-brand-50"
                  >
                    <Icon name="plus" size={14} /> 하위 추가
                  </button>
                </foreignObject>
              );
            }

            const b = n.bucket!;
            const leaf = isLeaf(b, buckets);
            const ofTotal = ratioOfTotal(b, buckets);
            const month = monthlyManwon(b, buckets, monthlyIncome);
            const selected = b.id === selectedId;
            const parentLabel = b.parentId ? "상위" : "수입";

            return (
              <foreignObject key={n.id} x={n.x} y={n.y} width={n.w} height={n.h}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(b.id);
                    }
                  }}
                  className={`group flex h-full w-full cursor-pointer flex-col justify-center rounded-xl border px-2.5 py-1.5 text-left transition-shadow ${CAT_NODE[b.category]} ${
                    selected ? "ring-2 ring-brand-500 shadow-sm" : "hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-0.5 text-[13px] font-bold leading-tight">
                        {b.isLocked && <Icon name="lock" size={11} className="text-locked" />}
                        <span className="truncate">{b.name}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-[10px] opacity-80">
                        <span className="tnum font-semibold">
                          {parentLabel} {b.ratioPct}%
                        </span>
                        <span className="tnum">전체 {ofTotal.toFixed(1).replace(/\.0$/, "")}%</span>
                        <span className="tnum font-semibold">월 {month}만</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`${b.name} 삭제`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(b.id);
                      }}
                      className="shrink-0 rounded p-0.5 text-ink-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                  {selected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickAddParent(b.id);
                      }}
                      className="mt-1 flex w-full items-center justify-center gap-0.5 rounded-md bg-white/70 py-0.5 text-[10px] font-bold text-ink-600 hover:bg-white"
                    >
                      <Icon name="plus" size={11} /> 하위
                    </button>
                  )}
                  {!leaf && !selected && (
                    <div className="mt-0.5 text-[9px] font-semibold opacity-50">묶음</div>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>

      <p className="border-t border-ink-100 px-3 py-2 text-[11px] text-ink-400">
        노드를 눌러 포커스 · 하위 추가/왼쪽 팔레트로 가지를 뻗으세요 · ×로 삭제
      </p>

      {quickAddParent !== undefined && (
        <QuickAddMenu
          parentId={quickAddParent}
          parent={quickAddParent ? buckets.find((b) => b.id === quickAddParent) ?? null : null}
          buckets={buckets}
          onAdd={onAdd}
          onClose={() => setQuickAddParent(undefined)}
        />
      )}
    </div>
  );
}
