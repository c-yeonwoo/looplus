import type { Bucket } from "../types";
import { childrenOf, roots } from "./tree";

export const NODE_W = 168;
export const NODE_H = 70;
export const COL_GAP = 52;
export const ROW_GAP = 14;
export const PAD_X = 20;
export const PAD_Y = 36;

export type GraphNodeKind = "income" | "bucket" | "pool" | "add";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  bucket?: Bucket;
  /** 트리 depth (income=0) */
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
  /** spend 계열은 약한 톤 */
  tone: "brand" | "spend" | "dashed";
  ratio: number;
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

/** 서브트리에 세로 좌표 배정 (중심 y) */
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

function collect(
  slot: TreeSlot,
  depth: number,
  out: GraphNode[],
  edges: GraphEdge[],
  parentId: string,
) {
  const x = PAD_X + depth * (NODE_W + COL_GAP);
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
  edges.push({
    id: `${parentId}->${slot.bucket.id}`,
    fromId: parentId,
    toId: slot.bucket.id,
    tone: slot.bucket.category === "spend" ? "spend" : "brand",
    ratio: slot.bucket.ratioPct,
  });
  for (const c of slot.children) collect(c, depth + 1, out, edges, slot.bucket.id);
}

export function layoutEngineGraph(
  buckets: Bucket[],
  opts?: { addUnderId?: string | null },
): { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number; maxDepth: number } {
  const rowH = NODE_H + ROW_GAP;
  const topSlots = roots(buckets).map((r) => buildSlot(r, buckets));

  let cursor = PAD_Y;
  for (const s of topSlots) {
    cursor = placeY(s, cursor, rowH);
  }
  const contentH = Math.max(rowH, cursor - PAD_Y);
  const incomeY = PAD_Y + contentH / 2;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const income: GraphNode = {
    id: "__income__",
    kind: "income",
    depth: 0,
    x: PAD_X,
    y: incomeY - 48,
    w: NODE_W - 20,
    h: 96,
  };
  nodes.push(income);

  let maxDepth = 1;
  for (const s of topSlots) {
    collect(s, 1, nodes, edges, "__income__");
  }
  for (const n of nodes) {
    if (n.kind === "bucket") maxDepth = Math.max(maxDepth, n.depth);
  }

  // 선택 노드 아래 "추가" 고스트
  const addUnder = opts?.addUnderId;
  if (addUnder) {
    const parent = nodes.find((n) => n.id === addUnder && n.kind === "bucket");
    if (parent) {
      const kids = childrenOf(addUnder, buckets);
      const lastKid = kids.length
        ? nodes.find((n) => n.id === kids[kids.length - 1]!.id)
        : null;
      const gx = parent.x + NODE_W + COL_GAP;
      const gy = lastKid
        ? lastKid.y + NODE_H + ROW_GAP
        : parent.y + (NODE_H - 48) / 2;
      const addId = `__add__${addUnder}`;
      nodes.push({
        id: addId,
        kind: "add",
        depth: parent.depth + 1,
        x: gx,
        y: gy,
        w: 120,
        h: 48,
      });
      edges.push({
        id: `${addUnder}->${addId}`,
        fromId: addUnder,
        toId: addId,
        tone: "dashed",
        ratio: 0,
      });
      maxDepth = Math.max(maxDepth, parent.depth + 1);
    }
  }

  // 모인 자산 — 투자/저축 리프에서 유입
  const feed = nodes.filter(
    (n) =>
      n.kind === "bucket" &&
      n.bucket &&
      n.bucket.category !== "spend" &&
      childrenOf(n.bucket.id, buckets).length === 0,
  );
  const poolX = PAD_X + (maxDepth + 1) * (NODE_W + COL_GAP);
  const poolY = incomeY - 70;
  if (feed.length > 0) {
    nodes.push({
      id: "__pool__",
      kind: "pool",
      depth: maxDepth + 1,
      x: poolX,
      y: poolY,
      w: 128,
      h: 140,
    });
    for (const f of feed) {
      edges.push({
        id: `${f.id}->__pool__`,
        fromId: f.id,
        toId: "__pool__",
        tone: "brand",
        ratio: f.bucket?.ratioPct ?? 0,
      });
    }
    // 재유입 표시용 점선 (pool → income) — 별도 edge
    edges.push({
      id: "__pool__->__income__",
      fromId: "__pool__",
      toId: "__income__",
      tone: "dashed",
      ratio: 0,
    });
  }

  const width = poolX + 128 + PAD_X + 8;
  const height = Math.max(PAD_Y * 2 + contentH, income.y + income.h + PAD_Y, 420);
  // 노드가 뷰 밖으로 나가지 않게 bottom 확장
  let maxBottom = height;
  for (const n of nodes) {
    maxBottom = Math.max(maxBottom, n.y + n.h + PAD_Y);
  }

  return { nodes, edges, width, height: maxBottom, maxDepth };
}

export function edgePath(
  from: GraphNode,
  to: GraphNode,
  opts?: { reinvest?: boolean },
): string {
  if (opts?.reinvest || (from.kind === "pool" && to.kind === "income")) {
    const x1 = from.x + from.w / 2;
    const y1 = from.y;
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const midY = Math.min(y1, y2) - 28;
    return `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
  }
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}
