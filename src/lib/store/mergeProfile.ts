import type { Bucket, Profile } from "../types";

/**
 * 원격 프로필을 로컬에 병합한다.
 *
 * 이전에는 로그인 시 `replaceProfile(remote)` 로 통째로 갈아치웠다. 그런데 원격에
 * 저장 경로가 없던 필드(지출 기록·UI 선호·캔버스 좌표)는 remote 에서 항상 빈 값이라,
 * 로그인하는 순간 그 데이터가 사라졌다. 지출 화면에 몇 달치를 기록해도 로그인 한 번에
 * 0원이 됐다.
 *
 * 정책: 원격이 **저장한 적 있는** 필드는 원격이 정답. 저장한 적 없으면(마이그레이션 이전
 * 행) 로컬을 유지한다. "저장했지만 비어 있음"은 사용자가 지운 것이므로 존중한다 —
 * 그래서 `stored` 플래그로 미저장과 빈 값을 구분한다.
 */

/** 원격 행에 해당 컬럼이 실제로 채워져 있었는지 (null = 마이그레이션 이전) */
export interface StoredFlags {
  spending: boolean;
  uiPrefs: boolean;
  engineLayout: boolean;
}

export interface LoadedProfile {
  profile: Profile;
  stored: StoredFlags;
}

/** 원격 좌표가 없으면 로컬 좌표를 이어붙인다 (id 기준 매칭) */
function withLocalCanvas(remote: Bucket[], local: Bucket[]): Bucket[] {
  if (local.length === 0) return remote;
  const byId = new Map(local.map((b) => [b.id, b]));
  return remote.map((b) => {
    if (b.canvasX != null && b.canvasY != null) return b;
    const l = byId.get(b.id);
    if (!l) return b;
    return {
      ...b,
      canvasX: b.canvasX ?? l.canvasX ?? null,
      canvasY: b.canvasY ?? l.canvasY ?? null,
    };
  });
}

export function mergeRemoteIntoLocal(loaded: LoadedProfile, local: Profile): Profile {
  const { profile: remote, stored } = loaded;

  return {
    ...remote,
    spending: stored.spending ? remote.spending : local.spending,
    uiPrefs: stored.uiPrefs ? remote.uiPrefs : (local.uiPrefs ?? remote.uiPrefs),
    engine: {
      ...(stored.engineLayout
        ? remote.engine
        : {
            ...remote.engine,
            incomeCanvasX: local.engine.incomeCanvasX ?? null,
            incomeCanvasY: local.engine.incomeCanvasY ?? null,
            poolCanvasX: local.engine.poolCanvasX ?? null,
            poolCanvasY: local.engine.poolCanvasY ?? null,
            edgeControls: local.engine.edgeControls ?? {},
            showIncomeSources: local.engine.showIncomeSources ?? true,
          }),
      buckets: withLocalCanvas(remote.engine.buckets, local.engine.buckets),
    },
  };
}
