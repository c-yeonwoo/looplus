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

  it("지출 루트도 수입과 연결점·경로를 가진다", () => {
    const buckets = [
      b({ id: "invest", category: "invest", ratioPct: 60, position: 0 }),
      b({ id: "spend", category: "spend", ratioPct: 40, position: 1 }),
    ];
    const { edges } = layoutEngineGraph(buckets);
    const link = edges.find((e) => e.fromId === "__income__" && e.toId === "spend");
    expect(link).toBeTruthy();
    expect(link!.x2).toBeGreaterThan(link!.x1);
    expect(link!.tone).toBe("spend");
    expect(edgePath(link!)).toMatch(/^M/);
  });

  it("edge id에 특수문자 없음", () => {
    const { edges } = layoutEngineGraph([b({ id: "a", ratioPct: 100 })]);
    for (const e of edges) {
      expect(e.id).toMatch(/^[a-zA-Z0-9_-]+$/);
    }
  });
});
