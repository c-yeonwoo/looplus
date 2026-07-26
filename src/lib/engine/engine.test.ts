import { describe, it, expect } from "vitest";
import { computeStage, computeMetrics } from "./stage";
import { projectEngine, ratioSum, needsRealityNudge, adjustReturns, SENSITIVITY } from "./projection";
import { selectGoalState } from "./goalState";
import { DEFAULT_VISION } from "../store/defaults";
import type { Bucket, FinancialSnapshot } from "../types";

function snapshot(overrides: Partial<FinancialSnapshot> = {}): FinancialSnapshot {
  return {
    cash: 2000,
    investAssets: 1500,
    realEstate: 0,
    liabilities: 500,
    incomeSources: [
      { type: "labor", monthly: 300 },
      { type: "capital", monthly: 5 },
    ],
    monthlySpending: 160,
    emergencyMonths: 1,
    ...overrides,
  };
}

function bucket(over: Partial<Bucket>): Bucket {
  return {
    id: Math.random().toString(36).slice(2),
    category: "invest",
    name: "test",
    ratioPct: 0,
    expectedAnnualReturnPct: 0,
    realizedYieldPct: 0,
    isLocked: false,
    position: 0,
    ...over,
  };
}

describe("computeMetrics", () => {
  it("wireframe 예시(16번)와 일치: 순자산 3000만, 저축률 ~48%, 근로98:자본2, passive/생활비 3%", () => {
    const m = computeMetrics(snapshot());
    expect(m.netWorth).toBe(3000); // 2000+1500+0-500
    expect(Math.round(m.savingsRatePct)).toBe(48); // (305-160)/305
    expect(Math.round(m.laborSharePct)).toBe(98);
    expect(Math.round(m.passiveToSpendingPct)).toBe(3); // 5/160
  });
});

describe("computeStage", () => {
  it("소득만 있고 저축률 낮으면 1단계", () => {
    const r = computeStage(
      snapshot({ monthlySpending: 290, emergencyMonths: 0 }),
    );
    expect(r.stage).toBe(1);
  });

  it("비상금+저축률+투자자산 있으면 최소 3단계", () => {
    const r = computeStage(
      snapshot({ emergencyMonths: 3, monthlySpending: 160, investAssets: 1500 }),
    );
    expect(r.stage).toBeGreaterThanOrEqual(3);
  });

  it("passive(자본소득) > 생활비면 8단계 override", () => {
    const r = computeStage(
      snapshot({
        incomeSources: [{ type: "capital", monthly: 300 }],
        monthlySpending: 160,
      }),
    );
    expect(r.stage).toBe(8);
  });

  it("항상 다음 한 걸음을 제시한다", () => {
    expect(computeStage(snapshot()).nextStep).toBeTruthy();
  });
});

describe("projectEngine", () => {
  const invest100: Bucket[] = [
    bucket({ category: "invest", name: "주식", ratioPct: 100, expectedAnnualReturnPct: 8, realizedYieldPct: 2 }),
  ];

  it("year 0 순자산 = 현재 스냅샷 순자산", () => {
    const r = projectEngine({ snapshot: snapshot(), buckets: invest100, horizonYears: 15 });
    expect(r.curve[0].totalNetWorth).toBe(3000);
    expect(r.curve[0].year).toBe(0);
  });

  it("복리로 자산이 증가한다 (단조 증가)", () => {
    const r = projectEngine({ snapshot: snapshot(), buckets: invest100, horizonYears: 15 });
    for (let i = 1; i < r.curve.length; i++) {
      expect(r.curve[i].totalNetWorth).toBeGreaterThan(r.curve[i - 1].totalNetWorth);
    }
  });

  it("하이브리드: 실현 자본소득이 시간이 지나며 증가한다 (upstream 재유입)", () => {
    const r = projectEngine({ snapshot: snapshot(), buckets: invest100, horizonYears: 15 });
    const early = r.curve[2].monthlyPassiveIncome;
    const late = r.curve[14].monthlyPassiveIncome;
    expect(late).toBeGreaterThan(early);
  });

  it("locked(연금) 버킷은 잠긴 자산으로 분리되고 passive에 안 잡힌다", () => {
    const locked: Bucket[] = [
      bucket({ category: "invest", name: "연금", ratioPct: 100, expectedAnnualReturnPct: 7, realizedYieldPct: 5, isLocked: true }),
    ];
    // 자본소득·보유 자산 없는 스냅샷으로 격리 → locked 실현분이 passive로 새지 않음을 검증
    const bare = snapshot({
      incomeSources: [{ type: "labor", monthly: 300 }],
      cash: 0,
      investAssets: 0,
      realEstate: 0,
    });
    const r = projectEngine({ snapshot: bare, buckets: locked, horizonYears: 10 });
    expect(r.curve[10].lockedAssets).toBeGreaterThan(0);
    expect(r.curve[10].monthlyPassiveIncome).toBe(0); // 실현분도 잠김
  });

  it("지출 버킷은 자산에 누적되지 않는다", () => {
    const withSpend: Bucket[] = [
      bucket({ category: "invest", name: "주식", ratioPct: 50, expectedAnnualReturnPct: 8, realizedYieldPct: 2 }),
      bucket({ category: "spend", name: "지출", ratioPct: 50 }),
    ];
    const onlyInvest: Bucket[] = [
      bucket({ category: "invest", name: "주식", ratioPct: 50, expectedAnnualReturnPct: 8, realizedYieldPct: 2 }),
    ];
    const a = projectEngine({ snapshot: snapshot(), buckets: withSpend, horizonYears: 10 });
    const b = projectEngine({ snapshot: snapshot(), buckets: onlyInvest, horizonYears: 10 });
    // 같은 투자 배분이면 지출 버킷 유무는 자산 결과에 영향 없음
    expect(a.curve[10].totalNetWorth).toBeCloseTo(b.curve[10].totalNetWorth, 5);
  });

  it("보유 자산은 버킷 구성과 무관하게 자기 가정으로 굴러간다", () => {
    // 예전엔 보유 자산을 ratioPct 로 쪼개 버킷에 심어서, 흐름 배분만 바꿔도
    // 이미 가진 돈의 성장률이 달라졌다. 이제는 분리돼 있어야 한다.
    const s = snapshot({
      cash: 0,
      investAssets: 10000,
      realEstate: 0,
      liabilities: 0,
      incomeSources: [{ type: "labor", monthly: 0 }],
    });
    const holdingReturns = {
      cash: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
      invest: { expectedAnnualReturnPct: 4, realizedYieldPct: 3 },
      realEstate: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
    };
    // 배분 0% → 흐름은 없고 보유 자산만 남는다. 버킷 구성이 달라도 결과가 같아야 한다.
    const a = projectEngine({
      snapshot: s,
      horizonYears: 10,
      holdingReturns,
      buckets: [bucket({ category: "invest", ratioPct: 0, expectedAnnualReturnPct: 8, realizedYieldPct: 2 })],
    });
    const b = projectEngine({
      snapshot: s,
      horizonYears: 10,
      holdingReturns,
      buckets: [
        bucket({ category: "invest", ratioPct: 0, expectedAnnualReturnPct: 12, isLocked: true }),
        bucket({ category: "save", ratioPct: 0, expectedAnnualReturnPct: 3 }),
      ],
    });
    // 미실현 1%(= 기대 4% − 실현 3%)로만 복리
    expect(a.finalNetWorth).toBeCloseTo(10000 * 1.01 ** 10, 4);
    expect(b.finalNetWorth).toBeCloseTo(a.finalNetWorth, 6);
  });

  it("보유 자산 종류별 가정을 따른다 — 현금은 주식 수익률로 불어나지 않는다", () => {
    const cashOnly = snapshot({
      cash: 10000,
      investAssets: 0,
      realEstate: 0,
      liabilities: 0,
      incomeSources: [{ type: "labor", monthly: 0 }],
    });
    const r = projectEngine({
      snapshot: cashOnly,
      buckets: invest100,
      horizonYears: 10,
      holdingReturns: {
        cash: { expectedAnnualReturnPct: 2, realizedYieldPct: 0 },
        invest: { expectedAnnualReturnPct: 20, realizedYieldPct: 10 },
        realEstate: { expectedAnnualReturnPct: 20, realizedYieldPct: 10 },
      },
    });
    // 현금 1억이 연 2% 로만 성장 — 투자 가정(20%) 이 새어들지 않는다
    expect(r.curve[10].totalNetWorth).toBeCloseTo(10000 * 1.02 ** 10, 4);
    expect(r.curve[10].monthlyPassiveIncome).toBe(0); // 실현 0%
  });

  it("보유 자산 실현분이 자본소득으로 자동 재유입된다", () => {
    const holdingsOnly = snapshot({
      cash: 0,
      investAssets: 10000,
      realEstate: 0,
      liabilities: 0,
      incomeSources: [{ type: "labor", monthly: 0 }],
    });
    const r = projectEngine({
      snapshot: holdingsOnly,
      buckets: invest100,
      horizonYears: 5,
      holdingReturns: {
        cash: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
        invest: { expectedAnnualReturnPct: 4, realizedYieldPct: 3 },
        realEstate: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
      },
    });
    // 1억 × 3% = 연 300만 → 월 25만
    expect(r.curve[0].monthlyPassiveIncome).toBeCloseTo(25, 6);
    // 그 자본소득이 다음 해 배분 대상(수입)이 되어 버킷에 쌓인다
    expect(r.curve[1].totalNetWorth).toBeGreaterThan(r.curve[0].totalNetWorth);
  });

  it("입력한 자본소득과 보유 자산 추정을 중복으로 더하지 않는다", () => {
    // 월 25만 자본소득 = 1억 × 3% 실현. 같은 자산에서 나온 돈이라 두 번 세면 안 된다.
    const returns = {
      cash: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
      invest: { expectedAnnualReturnPct: 4, realizedYieldPct: 3 },
      realEstate: { expectedAnnualReturnPct: 0, realizedYieldPct: 0 },
    };
    const base = {
      cash: 0,
      investAssets: 10000,
      realEstate: 0,
      liabilities: 0,
    };
    const declared = projectEngine({
      snapshot: snapshot({ ...base, incomeSources: [{ type: "capital", monthly: 25 }] }),
      buckets: invest100,
      horizonYears: 5,
      holdingReturns: returns,
    });
    const silent = projectEngine({
      snapshot: snapshot({ ...base, incomeSources: [{ type: "labor", monthly: 0 }] }),
      buckets: invest100,
      horizonYears: 5,
      holdingReturns: returns,
    });
    expect(declared.curve[0].monthlyPassiveIncome).toBeCloseTo(25, 6);
    expect(declared.finalNetWorth).toBeCloseTo(silent.finalNetWorth, 6);
  });

  it("목표 순자산 도달 연차(ETA)와 달성률을 계산한다", () => {
    const r = projectEngine({
      snapshot: snapshot(),
      buckets: invest100,
      horizonYears: 40,
      goalNetworth: 50000, // 5억
    });
    expect(r.achievementPct).toBeCloseTo(6, 0); // 3000/50000
    expect(r.targetReachYear).not.toBeNull();
    expect(r.targetReachYear! > 0).toBe(true);
  });
});

describe("adjustReturns (민감도)", () => {
  const buckets: Bucket[] = [
    bucket({ category: "invest", name: "주식", ratioPct: 60, expectedAnnualReturnPct: 8, realizedYieldPct: 2 }),
    bucket({ category: "save", name: "비상금", ratioPct: 20, expectedAnnualReturnPct: 3 }),
    bucket({ category: "spend", name: "지출", ratioPct: 20 }),
  ];

  it("delta 0이면 변화 없음", () => {
    expect(adjustReturns(buckets, 0)).toBe(buckets);
  });

  it("보수(-3)는 기대수익률을 낮추고 0% 하한, 지출 버킷은 불변", () => {
    const c = adjustReturns(buckets, SENSITIVITY.conservative.deltaPp);
    expect(c[0].expectedAnnualReturnPct).toBe(5); // 8-3
    expect(c[1].expectedAnnualReturnPct).toBe(0); // 3-3
    expect(c[2].expectedAnnualReturnPct).toBe(0); // spend 불변
    expect(c[0].realizedYieldPct).toBeLessThanOrEqual(c[0].expectedAnnualReturnPct);
  });

  it("밴드 순서: 보수 ≤ 기본 ≤ 공격 (최종 순자산)", () => {
    const s = snapshot();
    const low = projectEngine({ snapshot: s, buckets: adjustReturns(buckets, -3), horizonYears: 20 });
    const base = projectEngine({ snapshot: s, buckets, horizonYears: 20 });
    const high = projectEngine({ snapshot: s, buckets: adjustReturns(buckets, 3), horizonYears: 20 });
    expect(low.finalNetWorth).toBeLessThanOrEqual(base.finalNetWorth);
    expect(base.finalNetWorth).toBeLessThanOrEqual(high.finalNetWorth);
  });
});

describe("helpers", () => {
  it("ratioSum — 루트만 합산 (자식 비율 제외)", () => {
    expect(ratioSum([bucket({ ratioPct: 54 }), bucket({ ratioPct: 46 })])).toBe(100);
    expect(
      ratioSum([
        bucket({ id: "root", ratioPct: 100 }),
        bucket({ id: "child", parentId: "root", ratioPct: 50 }),
      ]),
    ).toBe(100);
  });

  it("계층 배분도 프로젝션에 반영", () => {
    const s = snapshot();
    const invest = bucket({ id: "g", category: "invest", ratioPct: 100, expectedAnnualReturnPct: 0 });
    const stock = bucket({
      id: "s",
      category: "invest",
      parentId: "g",
      ratioPct: 100,
      expectedAnnualReturnPct: 8,
      realizedYieldPct: 0,
    });
    const nested = projectEngine({ snapshot: s, buckets: [invest, stock], horizonYears: 10 });
    const flat = projectEngine({
      snapshot: s,
      buckets: [
        bucket({
          category: "invest",
          ratioPct: 100,
          expectedAnnualReturnPct: 8,
          realizedYieldPct: 0,
        }),
      ],
      horizonYears: 10,
    });
    expect(nested.finalNetWorth).toBe(flat.finalNetWorth);
  });
  it("needsRealityNudge: 목표를 정한 뒤 도달 못하면 true", () => {
    expect(needsRealityNudge("not_reached", null, 15)).toBe(true);
    expect(needsRealityNudge("reached", 12, 15)).toBe(false);
    expect(needsRealityNudge("reached", 30, 15)).toBe(true); // 시점의 1.5배 초과
  });

  it("needsRealityNudge: 목표 미설정은 실패가 아니므로 false", () => {
    expect(needsRealityNudge("unset", null, 15)).toBe(false);
  });
});

describe("목표 판정 — 미설정과 미도달을 구분한다", () => {
  const invest100 = [
    bucket({
      category: "invest",
      name: "주식",
      ratioPct: 100,
      expectedAnnualReturnPct: 7,
      realizedYieldPct: 0,
    }),
  ];

  it("목표를 안 정하면 targetStatus=unset (미도달이 아니다)", () => {
    const r = projectEngine({ snapshot: snapshot(), buckets: invest100, horizonYears: 20 });
    expect(r.targetStatus).toBe("unset");
    expect(r.passiveStatus).toBe("unset");
    expect(r.targetReachYear).toBeNull();
    expect(r.achievementPct).toBe(0);
  });

  it("목표를 정하고 기간 내 도달하면 reached", () => {
    const r = projectEngine({
      snapshot: snapshot(),
      buckets: invest100,
      horizonYears: 40,
      goalNetworth: 50000,
    });
    expect(r.targetStatus).toBe("reached");
    expect(r.targetReachYear).not.toBeNull();
  });

  it("목표를 정했지만 기간 내 도달 못하면 not_reached", () => {
    const r = projectEngine({
      snapshot: snapshot(),
      buckets: invest100,
      horizonYears: 5,
      goalNetworth: 10_000_000, // 1조 — 5년 내 도달 불가
    });
    expect(r.targetStatus).toBe("not_reached");
    expect(r.targetReachYear).toBeNull();
  });

  it("selectGoalState: 미설정이면 안내 문구를 주고 넛지·달성률을 숨긴다", () => {
    const r = projectEngine({ snapshot: snapshot(), buckets: invest100, horizonYears: 20 });
    const g = selectGoalState({ ...DEFAULT_VISION, targetYears: 10 }, r);
    expect(g.hasNumericGoal).toBe(false);
    expect(g.showRealityNudge).toBe(false);
    expect(g.showBigNumbers).toBe(false);
    expect(g.achievementPct).toBeNull();
    expect(g.reachLabel).toBe("목표 미설정");
    expect(g.guardCopy).not.toBeNull();
  });

  it("selectGoalState: 목표가 있으면 안내 문구가 사라지고 도달 라벨이 나온다", () => {
    const r = projectEngine({
      snapshot: snapshot(),
      buckets: invest100,
      horizonYears: 40,
      goalNetworth: 50000,
    });
    const g = selectGoalState(
      { ...DEFAULT_VISION, goalNetworth: 50000, targetYears: 40 },
      r,
    );
    expect(g.hasNumericGoal).toBe(true);
    expect(g.guardCopy).toBeNull();
    expect(g.showBigNumbers).toBe(true);
    expect(g.reachLabel).toMatch(/^약 \d+년$/);
  });

  it("selectGoalState: vision 이 없어도 미설정으로 안전하게 판정한다", () => {
    const g = selectGoalState(null, null);
    expect(g.targetStatus).toBe("unset");
    expect(g.showRealityNudge).toBe(false);
    expect(g.guardCopy).not.toBeNull();
  });
});
