"use client";

import { useEffect, useRef } from "react";
import { useProfile, selectSpending } from "@/lib/store/useProfile";
import { DEFAULT_SNAPSHOT } from "@/lib/store/defaults";
import { monthSpendingBreakdown } from "@/lib/spending/bridge";
import { track } from "@/lib/analytics";

/**
 * uiPrefs.autoSyncSpendToDiagnosis 켜면
 * 당월 지출 실측 → snapshot.monthlySpending 자동 반영.
 */
export function SpendDiagnosisSync() {
  const autoSync = useProfile(
    (s) => s.profile.uiPrefs?.autoSyncSpendToDiagnosis ?? false,
  );
  const profile = useProfile((s) => s.profile);
  const setSnapshot = useProfile((s) => s.setSnapshot);
  /*
    selectSpending 은 매 렌더 새 객체를 만든다. 그래서 effect 는 객체가 아니라 실제로
    쓰는 두 필드만 본다 — 객체째로 의존하면 렌더마다 이펙트가 다시 돈다.
  */
  const { logs, fixed } = selectSpending(profile);
  const lastSynced = useRef<number | null>(null);

  useEffect(() => {
    if (!autoSync) {
      lastSynced.current = null;
      return;
    }
    const now = new Date();
    const measured = monthSpendingBreakdown(
      { logs, fixed },
      now.getFullYear(),
      now.getMonth(),
    );
    if (measured.totalWon <= 0) return;
    if (lastSynced.current === measured.manwon) return;

    const snapshot = profile.snapshot ?? DEFAULT_SNAPSHOT;
    if (snapshot.monthlySpending === measured.manwon) {
      lastSynced.current = measured.manwon;
      return;
    }

    setSnapshot({ ...snapshot, monthlySpending: measured.manwon });
    lastSynced.current = measured.manwon;
    track("spend_auto_synced", {
      to: measured.manwon,
      variable_won: measured.variableWon,
      fixed_won: measured.fixedWon,
    });
  }, [autoSync, logs, fixed, profile.snapshot, setSnapshot]);

  return null;
}
