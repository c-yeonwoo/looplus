import type { Bucket } from "../types";
import { childrenOf, roots } from "./tree";

export const NODE_W = 168;
export const NODE_H = 70;
export const COL_GAP = 56;
export const ROW_GAP = 14;
export const PAD_X = 20;
export const PAD_Y = 36;
export const INCOME_W = 148;
export const INCOME_H = 96;
export const POOL_W = 128;
export const POOL_H = 140;

export type GraphNodeKind = "income" | "bucket" | "pool";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  bucket?: Bucket;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  tone: "brand" | "spend" | "dashed";
  ratio: number;
  /** 절대 좌표 연결점 (거터 라우팅) */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TreeSlot {
  bucket: Bucket;
  children: TreeSlot[];
  weight: number;
  y: number;
}

function buildSlot(bucket: Bucket, all: Bucket[]): TreeSlot {
  const kids = childrenOf(bucket.id, all).map((c) => buildSlot(c, all));
  const weight = kids.length === 0 ? 1 : kids.reduce((s, k) => s + k.weight, 0);
  return { bucket, children: kids, weight, y: 0 };
}

function placeY(slot: TreeSlot, top: number, rowH: number): number {
  if (slot.children.length === 0) {
    slot.y = top + rowH / 2;
    return top + rowH;
  }
  let cursor = top;
  for (const c of slot.children) {
    cursor = placeY(c, cursor, rowH);
  }
  const first = slot.children[0]!.y;
  const last = slot.children[slot.children.length - 1]!.y;
  slot.y = (first + last) / 2;
  return cursor;
}

function colX(depth: number): number {
  if (depth === 0) return PAD_X;
  return PAD_X + INCOME_W + COL_GAP + (depth - 1) * (NODE_W + COL_GAP);
}

function safeEdgeId(fromId: string, toId: string): string {
  return `e_${fromId}_to_${toId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function collect(
  slot: TreeSlot,
  depth: number,
  out: GraphNode[],
  edges: GraphEdge[],
  parent: GraphNode,
  siblingIndex: number,
  siblingCount: number,
) {
  const x = colX(depth);
  const node: GraphNode = {
    id: slot.bucket.id,
    kind: "bucket",
    bucket: slot.bucket,
    depth,
    x,
    y: slot.y - NODE_H / 2,
    w: NODE_W,
    h: NODE_H,
  };
  out.push(node);

  // 부모 우측 출구를 형제 수만큼 분산 → 수입↔지출 선이 한 점에 뭉치지 않음
  const pTop = parent.y + 10;
  const pUsable = Math.max(20, parent.h - 20);
  const y1 =
    siblingCount <= 1
      ? parent.y + parent.h / 2
      : pTop + ((siblingIndex + 0.5) / siblingCount) * pUsable;
  const y2 = node.y + node.h / 2;

  edges.push({
    id: safeEdgeId(parent.id, node.id),
    fromId: parent.id,
    toId: node.id,
    tone: slot.bucket.category === "spend" ? "spend" : "brand",
    ratio: slot.bucket.ratioPct,
    x1: parent.x + parent.w,
    y1,
    x2: node.x,
    y2,
  });

  const kids = slot.children;
  kids.forEach((c, i) => collect(c, depth + 1, out, edges, node, i, kids.length));
}

export function layoutEngineGraph(buckets: Bucket[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  maxDepth: number;
} {
  const rowH = NODE_H + ROW_GAP;
  const topSlots = roots(buckets).map((r) => buildSlot(r, buckets));

  let cursor = PAD_Y;
  for (const s of topSlots) {
    cursor = placeY(s, cursor, rowH);
  }
  const contentH = Math.max(rowH * 2, cursor - PAD_Y);
  const incomeCy = PAD_Y + contentH / 2;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const income: GraphNode = {
    id: "__income__",
    kind: "income",
    depth: 0,
    x: PAD_X,
    y: incomeCy - INCOME_H / 2,
    w: INCOME_W,
    h: INCOME_H,
  };
  nodes.push(income);

  topSlots.forEach((s, i) => collect(s, 1, nodes, edges, income, i, topSlots.length));

  let maxDepth = 1;
  for (const n of nodes) {
    if (n.kind === "bucket") maxDepth = Math.max(maxDepth, n.depth);
  }

  // 모인 자산 — 투자/저축 리프만 (지출은 수입에서 빠져나가는 흐름으로 끝)
  const feed = nodes.filter(
    (n) =>
      n.kind === "bucket" &&
      n.bucket &&
      n.bucket.category !== "spend" &&
      childrenOf(n.bucket.id, buckets).length === 0,
  );

  const poolX = colX(maxDepth) + NODE_W + COL_GAP;
  if (feed.length > 0) {
    const pool: GraphNode = {
      id: "__pool__",
      kind: "pool",
      depth: maxDepth + 1,
      x: poolX,
      y: incomeCy - POOL_H / 2,
      w: POOL_W,
      h: POOL_H,
    };
    nodes.push(pool);

    feed.forEach((f, i) => {
      const pTop = pool.y + 16;
      const pUsable = Math.max(20, pool.h - 32);
      const y2 =
        feed.length <= 1 ? pool.y + pool.h / 2 : pTop + ((i + 0.5) / feed.length) * pUsable;
      edges.push({
        id: safeEdgeId(f.id, pool.id),
        fromId: f.id,
        toId: pool.id,
        tone: "brand",
        ratio: f.bucket?.ratioPct ?? 0,
        x1: f.x + f.w,
        y1: f.y + f.h / 2,
        x2: pool.x,
        y2,
      });
    });

    edges.push({
      id: safeEdgeId(pool.id, income.id),
      fromId: pool.id,
      toId: income.id,
      tone: "dashed",
      ratio: 0,
      x1: pool.x + pool.w / 2,
      y1: pool.y,
      x2: income.x + income.w / 2,
      y2: income.y,
    });
  }

  const width = (feed.length > 0 ? poolX + POOL_W : colX(maxDepth) + NODE_W) + PAD_X;
  let maxBottom = PAD_Y + contentH + PAD_Y;
  for (const n of nodes) {
    maxBottom = Math.max(maxBottom, n.y + n.h + PAD_Y);
  }
  // 선택 UI와 무관하게 높이 하한 — 리사이즈 덜컹거림 완화
  const height = Math.max(maxBottom, 440);

  return { nodes, edges, width, height, maxDepth };
}

/** 거터(열 사이)만 지나는 직교+라운드 경로 — 노드 박스를 관통하지 않음 */
export function edgePath(e: GraphEdge, reinvest = false): string {
  if (reinvest) {
    const midY = Math.min(e.y1, e.y2) - 28;
    return `M${e.x1},${e.y1} C${e.x1},${midY} ${e.x2},${midY} ${e.x2},${e.y2}`;
  }
  const mx = (e.x1 + e.x2) / 2;
  return `M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`;
}
