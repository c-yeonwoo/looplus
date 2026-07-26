import { describe, it, expect } from "vitest";
import { mergeRemoteIntoLocal, type LoadedProfile, type StoredFlags } from "./mergeProfile";
import { profileHasData } from "./supabaseRepo";
import { emptyProfile } from "./defaults";
import type { Bucket, Profile } from "../types";
import type { VariableLog } from "../spending/types";

function log(over: Partial<VariableLog> = {}): VariableLog {
  return {
    id: "l1",
    amountWon: 12_000,
    category: "food",
    date: "2026-07-01",
    memo: "",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function bucket(over: Partial<Bucket> = {}): Bucket {
  return {
    id: "b1",
    category: "invest",
    name: "주식",
    ratioPct: 50,
    expectedAnnualReturnPct: 7,
    realizedYieldPct: 0,
    isLocked: false,
    position: 0,
    ...over,
  };
}

function local(over: (p: Profile) => void = () => {}): Profile {
  const p = emptyProfile();
  over(p);
  return p;
}

function loaded(over: (p: Profile) => void, stored: Partial<StoredFlags> = {}): LoadedProfile {
  const p = emptyProfile();
  over(p);
  return {
    profile: p,
    stored: { spending: false, uiPrefs: false, engineLayout: false, ...stored },
  };
}

describe("mergeRemoteIntoLocal", () => {
  it("마이그레이션 이전 원격(미저장)이면 로컬 지출 기록을 지킨다", () => {
    const l = local((p) => {
      p.spending.monthlyVariableBudgetWon = 700_000;
      p.spending.logs = [log()];
    });
    const r = loaded((p) => {
      p.snapshot = { ...emptyProfile().snapshot!, cash: 1000 } as Profile["snapshot"];
    });

    const merged = mergeRemoteIntoLocal(r, l);
    expect(merged.spending.monthlyVariableBudgetWon).toBe(700_000);
    expect(merged.spending.logs).toHaveLength(1);
  });

  it("원격이 저장한 빈 지출은 존중한다 (사용자가 지운 것 — 좀비 데이터 방지)", () => {
    const l = local((p) => {
      p.spending.monthlyVariableBudgetWon = 700_000;
      p.spending.logs = [log()];
    });
    const r = loaded(() => {}, { spending: true });

    const merged = mergeRemoteIntoLocal(r, l);
    expect(merged.spending.monthlyVariableBudgetWon).toBe(0);
    expect(merged.spending.logs).toHaveLength(0);
  });

  it("uiPrefs 미저장이면 로컬 선호를 유지한다", () => {
    const l = local((p) => {
      p.uiPrefs = { hiddenHomeMetrics: ["netWorth"], autoSyncSpendToDiagnosis: true };
    });
    const merged = mergeRemoteIntoLocal(loaded(() => {}), l);
    expect(merged.uiPrefs?.hiddenHomeMetrics).toEqual(["netWorth"]);
    expect(merged.uiPrefs?.autoSyncSpendToDiagnosis).toBe(true);
  });

  it("원격 버킷에 좌표가 없으면 같은 id 의 로컬 좌표를 이어붙인다", () => {
    const l = local((p) => {
      p.engine.buckets = [bucket({ id: "b1", canvasX: 120, canvasY: 340 })];
    });
    const r = loaded((p) => {
      p.engine.buckets = [bucket({ id: "b1", canvasX: null, canvasY: null })];
    });

    const merged = mergeRemoteIntoLocal(r, l);
    expect(merged.engine.buckets[0].canvasX).toBe(120);
    expect(merged.engine.buckets[0].canvasY).toBe(340);
  });

  it("원격 버킷에 좌표가 있으면 원격이 이긴다", () => {
    const l = local((p) => {
      p.engine.buckets = [bucket({ id: "b1", canvasX: 120, canvasY: 340 })];
    });
    const r = loaded((p) => {
      p.engine.buckets = [bucket({ id: "b1", canvasX: 900, canvasY: 10 })];
    });

    const merged = mergeRemoteIntoLocal(r, l);
    expect(merged.engine.buckets[0].canvasX).toBe(900);
  });

  it("원격에만 있는 버킷은 로컬 좌표가 없어도 그대로 둔다", () => {
    const r = loaded((p) => {
      p.engine.buckets = [bucket({ id: "remote-only", canvasX: null, canvasY: null })];
    });
    const merged = mergeRemoteIntoLocal(r, local());
    expect(merged.engine.buckets).toHaveLength(1);
    expect(merged.engine.buckets[0].canvasX).toBeNull();
  });

  it("레이아웃 미저장이면 로컬 캔버스 배치를 유지한다", () => {
    const l = local((p) => {
      p.engine.incomeCanvasX = 40;
      p.engine.poolCanvasY = 88;
      p.engine.showIncomeSources = false;
    });
    const merged = mergeRemoteIntoLocal(loaded(() => {}), l);
    expect(merged.engine.incomeCanvasX).toBe(40);
    expect(merged.engine.poolCanvasY).toBe(88);
    expect(merged.engine.showIncomeSources).toBe(false);
  });

  it("목표·현황은 원격이 정답 (로컬을 덮는다)", () => {
    const l = local((p) => {
      p.vision = { ...emptyProfile().vision!, goalNetworth: 111 } as Profile["vision"];
    });
    const r = loaded((p) => {
      p.vision = {
        goalNetworth: 50_000,
        goalPassiveIncome: 0,
        targetYears: 10,
        why: "",
        scenes: [],
      };
    });
    const merged = mergeRemoteIntoLocal(r, l);
    expect(merged.vision?.goalNetworth).toBe(50_000);
  });
});

describe("profileHasData", () => {
  it("지출 기록만 있어도 이관 대상이다", () => {
    const p = local((x) => {
      x.spending.logs = [log({ amountWon: 9_000 })];
    });
    expect(profileHasData(p)).toBe(true);
  });

  it("고정지출·예산만 있어도 이관 대상이다", () => {
    expect(profileHasData(local((x) => void (x.spending.monthlyVariableBudgetWon = 500_000)))).toBe(
      true,
    );
  });

  it("완전히 빈 프로필은 이관하지 않는다", () => {
    expect(profileHasData(emptyProfile())).toBe(false);
  });
});
