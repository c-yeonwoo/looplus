import { describe, it, expect } from "vitest";
import type { Bucket } from "../types";
import { layoutEngineGraph, edgePath } from "./layout";

function b(over: Partial<Bucket> & { id: string }): Bucket {
  return {
    category: "invest",
    name: over.id,
    ratioPct: 50,
    expectedAnnualReturnPct: 0,
    realizedYieldPct: 0,
    isLocked: false,
    position: 0,
    parentId: null,
    ...over,
  };
}

describe("layoutEngineGraph", () => {
  it("수입 → 루트 → 자식 순으로 depth 증가", () => {
    const buckets = [
      b({ id: "spend", category: "spend", ratioPct: 40 }),
      b({ id: "fixed", category: "spend", parentId: "spend", ratioPct: 100 }),
    ];
    const { nodes, edges } = layoutEngineGraph(buckets);
    const income = nodes.find((n) => n.kind === "income")!;
    const spend = nodes.find((n) => n.id === "spend")!;
    const fixed = nodes.find((n) => n.id === "fixed")!;
    expect(spend.x).toBeGreaterThan(income.x);
    expect(fixed.x).toBeGreaterThan(spend.x);
    expect(edges.some((e) => e.fromId === "__income__" && e.toId === "spend")).toBe(true);
    expect(edges.some((e) => e.fromId === "spend" && e.toId === "fixed")).toBe(true);
  });

  it("선택 시 하위 추가 고스트 노드", () => {
    const buckets = [b({ id: "invest", ratioPct: 100 })];
    const { nodes } = layoutEngineGraph(buckets, { addUnderId: "invest" });
    expect(nodes.some((n) => n.kind === "add")).toBe(true);
  });

  it("edgePath는 베지어 곡선", () => {
    const a = { id: "a", kind: "income" as const, depth: 0, x: 0, y: 0, w: 100, h: 80 };
    const b2 = { id: "b", kind: "bucket" as const, depth: 1, x: 200, y: 40, w: 100, h: 70 };
    expect(edgePath(a, b2)).toMatch(/^M/);
  });
});
