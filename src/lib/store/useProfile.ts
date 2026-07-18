"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Bucket,
  EngineConfig,
  FinancialSnapshot,
  Profile,
  Scenario,
  Tracking,
  Vision,
} from "../types";
import { emptyTracking } from "../types";
import { emptyProfile } from "./defaults";
import { hasCheckedInThisWeek } from "../tracking";

const MAX_SCENARIOS = 5; // 열린 결정 → 시나리오 저장 최대 5개

let idc = 0;
function sid() {
  idc += 1;
  return `s_${idc}_${Math.random().toString(36).slice(2, 8)}`;
}

interface ProfileState {
  profile: Profile;
  hasHydrated: boolean;

  setVision: (v: Vision) => void;
  setSnapshot: (s: FinancialSnapshot) => void;
  setEngine: (e: EngineConfig) => void;
  setBuckets: (b: Bucket[]) => void;
  addBucket: (b: Bucket) => void;
  updateBucket: (id: string, patch: Partial<Bucket>) => void;
  removeBucket: (id: string) => void;

  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;

  addAction: (text: string) => void;
  toggleAction: (id: string) => void;
  removeAction: (id: string) => void;
  weeklyCheckIn: () => void;

  completeOnboarding: () => void;
  resetAll: () => void;
  replaceProfile: (p: Profile) => void;
  setHasHydrated: (v: boolean) => void;
}

/** 구버전 localStorage 프로필에 tracking이 없을 수 있어 보정 */
function ensureTracking(p: Profile): Tracking {
  return p.tracking ?? emptyTracking();
}

function touch(p: Profile): Profile {
  return { ...p, updatedAt: new Date().toISOString() };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),
      hasHydrated: false,

      setVision: (v) => set((st) => ({ profile: touch({ ...st.profile, vision: v }) })),
      setSnapshot: (s) => set((st) => ({ profile: touch({ ...st.profile, snapshot: s }) })),
      setEngine: (e) => set((st) => ({ profile: touch({ ...st.profile, engine: e }) })),
      setBuckets: (b) =>
        set((st) => ({ profile: touch({ ...st.profile, engine: { buckets: b } }) })),

      addBucket: (b) =>
        set((st) => ({
          profile: touch({
            ...st.profile,
            engine: { buckets: [...st.profile.engine.buckets, b] },
          }),
        })),

      updateBucket: (id, patch) =>
        set((st) => ({
          profile: touch({
            ...st.profile,
            engine: {
              buckets: st.profile.engine.buckets.map((x) =>
                x.id === id ? { ...x, ...patch } : x,
              ),
            },
          }),
        })),

      removeBucket: (id) =>
        set((st) => ({
          profile: touch({
            ...st.profile,
            engine: {
              buckets: st.profile.engine.buckets.filter((x) => x.id !== id),
            },
          }),
        })),

      saveScenario: (name) =>
        set((st) => {
          const sc: Scenario = {
            id: sid(),
            name: name || `시나리오 ${st.profile.scenarios.length + 1}`,
            buckets: st.profile.engine.buckets.map((b) => ({ ...b })),
            createdAt: new Date().toISOString(),
          };
          const scenarios = [sc, ...st.profile.scenarios].slice(0, MAX_SCENARIOS);
          return { profile: touch({ ...st.profile, scenarios }) };
        }),

      loadScenario: (id) =>
        set((st) => {
          const sc = st.profile.scenarios.find((x) => x.id === id);
          if (!sc) return {};
          return {
            profile: touch({
              ...st.profile,
              engine: { buckets: sc.buckets.map((b) => ({ ...b })) },
            }),
          };
        }),

      deleteScenario: (id) =>
        set((st) => ({
          profile: touch({
            ...st.profile,
            scenarios: st.profile.scenarios.filter((x) => x.id !== id),
          }),
        })),

      addAction: (text) =>
        set((st) => {
          const t = ensureTracking(st.profile);
          const action = {
            id: sid(),
            text: text.trim(),
            done: false,
            createdAt: new Date().toISOString(),
          };
          return {
            profile: touch({ ...st.profile, tracking: { ...t, actions: [action, ...t.actions] } }),
          };
        }),

      toggleAction: (id) =>
        set((st) => {
          const t = ensureTracking(st.profile);
          return {
            profile: touch({
              ...st.profile,
              tracking: {
                ...t,
                actions: t.actions.map((a) =>
                  a.id === id
                    ? { ...a, done: !a.done, doneAt: !a.done ? new Date().toISOString() : undefined }
                    : a,
                ),
              },
            }),
          };
        }),

      removeAction: (id) =>
        set((st) => {
          const t = ensureTracking(st.profile);
          return {
            profile: touch({
              ...st.profile,
              tracking: { ...t, actions: t.actions.filter((a) => a.id !== id) },
            }),
          };
        }),

      weeklyCheckIn: () =>
        set((st) => {
          const t = ensureTracking(st.profile);
          if (hasCheckedInThisWeek(t.checkIns)) return {};
          return {
            profile: touch({
              ...st.profile,
              tracking: { ...t, checkIns: [...t.checkIns, new Date().toISOString()] },
            }),
          };
        }),

      completeOnboarding: () =>
        set((st) => ({
          profile: touch({
            ...st.profile,
            onboardedAt: st.profile.onboardedAt ?? new Date().toISOString(),
          }),
        })),

      resetAll: () => set({ profile: emptyProfile() }),
      replaceProfile: (p) => set({ profile: p }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "cyrano-profile-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (st) => ({ profile: st.profile }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const MAX_SCENARIOS_LIMIT = MAX_SCENARIOS;
