"use client";

import { useEffect, useState } from "react";
import type { Bucket } from "@/lib/types";
import { presetByKey, bucketFromPreset } from "@/lib/catalog";
import { formatKRW } from "@/lib/format";
import { Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * 엔진 캔버스 — 자금 흐름 그래프.
 * 멀티 수입(upstream) → 비율대로 각 버킷에 분배 → 자산 풀(downstream).
 * 링크는 시작/도착 지점을 분산해 서로 겹치지 않게 라우팅하고, 골드 파티클이 흐른다(SMIL).
 */

const VB_W = 720;
const ROW_H = 92;
const PAD_T = 34;
const PAD_B = 26;

const CAT_NODE: Record<string, string> = {
  invest: "border-invest-500 bg-invest-50 text-invest-700",
  save: "border-save-500 bg-save-50 text-save-700",
  spend: "border-spend-500 bg-spend-50 text-spend-700",
};

export function EngineCanvas({
  buckets,
  monthlyIncome,
  selectedId,
  onSelect,
  onAdd,
  onRecommend,
}: {
  buckets: Bucket[];
  monthlyIncome: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (b: Bucket) => void;
  onRecommend: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAnimate(!mq.matches);
    const on = () => setAnimate(!mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const key = e.dataTransfer.getData("application/bucket-preset");
    const preset = presetByKey(key);
    if (preset) onAdd(bucketFromPreset(preset, buckets.length));
  };

  const ordered = buckets.slice().sort((a, b) => a.position - b.position);
  const n = ordered.length;
  const H = Math.max(430, n * ROW_H + PAD_T + PAD_B);

  const inc = { x: 12, w: 132, h: 96, cy: H / 2 };
  const incRight = inc.x + inc.w;
  const bx = 300,
    bw = 224,
    bh = 66;
  const bRight = bx + bw;
  const pool = { x: 578, w: 130, h: 150, cy: H / 2 };
  const poolLeft = pool.x;

  const nodeY = (i: number) => PAD_T + i * ROW_H + ROW_H / 2;

  // income 우측 출구를 세로로 분산 → 선이 한 점에서 뭉치지 않음
  const incTop = inc.cy - inc.h / 2;
  const incUsable = inc.h - 22;
  const incExitY = (i: number) => incTop + 11 + ((i + 0.5) / Math.max(1, n)) * incUsable;

  // pool 좌측 입구 분산 (invest/save만)
  const feed = ordered.filter((b) => b.category !== "spend");
  const feedIndex = (b: Bucket) => feed.findIndex((f) => f.id === b.id);
  const poolTop = pool.cy - pool.h / 2;
  const poolUsable = pool.h - 28;
  const poolEntryY = (j: number) => poolTop + 14 + ((j + 0.5) / Math.max(1, feed.length)) * poolUsable;

  const branchPath = (exitY: number, by: number) => {
    const mx = (incRight + bx) / 2;
    return `M${incRight},${exitY} C${mx},${exitY} ${mx},${by} ${bx},${by}`;
  };
  const poolPath = (by: number, entryY: number) => {
    const mx = (bRight + poolLeft) / 2;
    return `M${bRight},${by} C${mx},${by} ${mx},${entryY} ${poolLeft},${entryY}`;
  };
  const linkWidth = (ratio: number) => 1.5 + (Math.max(0, Math.min(100, ratio)) / 100) * 8;

  if (n === 0) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-[460px] items-center justify-center rounded-xl border bg-white ${
          dragOver ? "border-2 border-dashed border-brand-400 bg-brand-50/40" : "border-ink-200"
        }`}
      >
        <EmptyState
          icon="layers"
          title="여기에 버킷을 끌어다 놓으세요"
          desc="수입에서 시작해, 팔레트의 버킷을 조립하면 자금 흐름과 복리 결과가 그려집니다."
          action={<Button onClick={onRecommend}>진단 데이터로 추천 배분 시작</Button>}
        />
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
      className={`rounded-xl border bg-white p-3 transition-colors ${
        dragOver ? "border-2 border-dashed border-brand-400 bg-brand-50/40" : "border-ink-200"
      }`}
    >
      <svg viewBox={`0 0 ${VB_W} ${H}`} className="w-full" style={{ height: "auto", aspectRatio: `${VB_W} / ${H}` }}>
        {/* 재투입 아크 (pool → income) */}
        <path
          d={`M${pool.x + pool.w / 2},${pool.cy - pool.h / 2} C${pool.x - 30},${24} ${inc.x + inc.w / 2},${24} ${inc.x + inc.w / 2},${inc.cy - inc.h / 2}`}
          fill="none"
          stroke="var(--color-brand-300)"
          strokeWidth="1.4"
          strokeDasharray="5 5"
        />
        <text x={VB_W / 2} y={16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--color-brand-600)">
          실현 자본소득 재투입 (하이브리드 복리)
        </text>

        {/* income → bucket 링크 */}
        {ordered.map((b, i) => {
          const y = nodeY(i);
          const ey = incExitY(i);
          const d = branchPath(ey, y);
          const id = `pin-${b.id}`;
          const isSpend = b.category === "spend";
          return (
            <g key={`lin-${b.id}`}>
              <path
                id={id}
                d={d}
                fill="none"
                stroke={isSpend ? "var(--color-spend-300)" : "var(--color-brand-200)"}
                strokeWidth={linkWidth(b.ratioPct)}
                opacity="0.7"
              />
              <path
                d={d}
                fill="none"
                stroke={isSpend ? "var(--color-spend-500)" : "var(--color-brand-500)"}
                strokeWidth="1.6"
                strokeDasharray="2 10"
                strokeLinecap="round"
                className={animate ? "flow-link" : undefined}
                opacity="0.85"
              />
              {animate && b.ratioPct > 0 && (
                <circle r="3.2" fill="var(--color-gold-400)">
                  <animateMotion dur={`${2.4 - Math.min(1.2, b.ratioPct / 100)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`}>
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {/* bucket(invest/save) → pool 링크 */}
        {ordered.map((b, i) => {
          if (b.category === "spend") return null;
          const y = nodeY(i);
          const ey = poolEntryY(feedIndex(b));
          const d = poolPath(y, ey);
          const id = `ppool-${b.id}`;
          return (
            <g key={`lpool-${b.id}`}>
              <path id={id} d={d} fill="none" stroke="var(--color-brand-200)" strokeWidth={linkWidth(b.ratioPct)} opacity="0.6" />
              {animate && b.ratioPct > 0 && (
                <circle r="2.8" fill="var(--color-gold-400)">
                  <animateMotion dur="1.9s" repeatCount="indefinite" begin={`${i * 0.3 + 0.7}s`}>
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {/* income 노드 */}
        <foreignObject x={inc.x} y={inc.cy - inc.h / 2} width={inc.w} height={inc.h}>
          <div className="flex h-full flex-col justify-center rounded-lg border border-brand-200 bg-brand-50 px-3 text-center">
            <div className="text-[11px] font-semibold text-brand-600">멀티 수입</div>
            <div className="tnum mt-0.5 text-sm font-bold text-brand-800">월 {formatKRW(monthlyIncome)}</div>
            <div className="mt-0.5 text-[10px] text-brand-400">근로·자본·부수입</div>
          </div>
        </foreignObject>

        {/* bucket 노드 */}
        {ordered.map((b, i) => {
          const y = nodeY(i) - bh / 2;
          const selected = b.id === selectedId;
          return (
            <foreignObject key={`n-${b.id}`} x={bx} y={y} width={bw} height={bh}>
              <button
                onClick={() => onSelect(b.id)}
                style={{ height: bh }}
                className={`flex w-full items-center justify-between rounded-lg border px-3 text-left transition-shadow ${CAT_NODE[b.category]} ${
                  selected ? "ring-2 ring-brand-500" : "hover:shadow-sm"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    {b.isLocked && <Icon name="lock" size={12} className="text-locked" />}
                    <span className="truncate">{b.name}</span>
                  </span>
                  <span className="block text-[10px] opacity-70">
                    {b.category === "spend" ? "소비 (out)" : `연 ${b.expectedAnnualReturnPct}%`}
                  </span>
                </span>
                <span className="tnum shrink-0 text-base font-extrabold">{b.ratioPct}%</span>
              </button>
            </foreignObject>
          );
        })}

        {/* pool 노드 */}
        {feed.length > 0 && (
          <foreignObject x={pool.x} y={pool.cy - pool.h / 2} width={pool.w} height={pool.h}>
            <div className="flex h-full flex-col items-center justify-center rounded-lg bg-brand-700 px-3 text-center text-white">
              <div className="text-sm font-bold">자산 풀</div>
              <div className="mt-0.5 text-[11px] opacity-80">복리 누적</div>
              <div className="mt-1.5 text-[10px] leading-relaxed opacity-70">
                미실현 = 내부 복리
                <br />
                실현 = 위로 재유입
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}
