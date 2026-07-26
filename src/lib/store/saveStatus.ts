import { create } from "zustand";

/**
 * 자동 저장 상태 — 저장 버튼 대신 "저장됨" 피드백용.
 * 로컬(localStorage)은 즉시, 클라우드는 SyncManager 가 디바운스 저장 결과를 올린다.
 */
export type SavePhase = "idle" | "pending" | "saving" | "saved" | "error";

interface SaveStatusState {
  phase: SavePhase;
  /** 마지막으로 저장이 끝난 시각 */
  savedAt: number | null;
  error: string | null;
  /** 로그인되어 클라우드로도 나가는가 */
  cloud: boolean;
  setCloud: (v: boolean) => void;
  markPending: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: (msg: string) => void;
  clearError: () => void;
}

export const useSaveStatus = create<SaveStatusState>((set) => ({
  phase: "idle",
  savedAt: null,
  error: null,
  cloud: false,
  setCloud: (cloud) => set({ cloud }),
  markPending: () => set({ phase: "pending", error: null }),
  markSaving: () => set({ phase: "saving", error: null }),
  markSaved: () => set({ phase: "saved", savedAt: Date.now(), error: null }),
  markError: (msg) => set({ phase: "error", error: msg }),
  clearError: () => set({ error: null, phase: "saved" }),
}));
