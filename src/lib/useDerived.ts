"use client";

import { useMemo } from "react";
import { useProfile } from "./store/useProfile";
import { computeStage, projectEngine, type StageResult } from "./engine";
import type { ProjectionResult } from "./types";

export interface Derived {
  stage: StageResult | null;
  projection: ProjectionResult | null;
}

/** 스냅샷/엔진/비전 → 단계 판정 + 복리 프로젝션 (메모이즈) */
export function useDerived(): Derived {
  const profile = useProfile((s) => s.profile);

  return useMemo(() => {
    const { snapshot, engine, vision } = profile;
    const stage = snapshot ? computeStage(snapshot) : null;

    let projection: ProjectionResult | null = null;
    if (snapshot) {
      const horizon = Math.max(vision?.targetYears ?? 15, 30);
      projection = projectEngine({
        snapshot,
        buckets: engine.buckets,
        horizonYears: horizon,
        goalNetworth: vision?.goalNetworth,
        goalPassiveIncome: vision?.goalPassiveIncome,
      });
    }
    return { stage, projection };
  }, [profile]);
}
