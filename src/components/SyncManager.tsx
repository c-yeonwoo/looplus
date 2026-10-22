"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/store/useProfile";
import { loadProfile, saveProfile } from "@/lib/store/supabaseRepo";
import {
  mergeRemoteIntoLocal,
  mergeTrackingByChoice,
  type LoadedProfile,
} from "@/lib/store/mergeProfile";
import { useSaveStatus } from "@/lib/store/saveStatus";
import { Icon } from "@/components/Icon";
import { planInitialSync } from "@/lib/store/syncPlan";

/** 동일 유저 짧은 재마운트·StrictMode 이중 호출 시 중복 GET 방지 */
const loadCache: {
  userId: string | null;
  at: number;
  loaded: LoadedProfile | null;
  inflight: Promise<LoadedProfile | null> | null;
} = { userId: null, at: 0, loaded: null, inflight: null };

const LOAD_TTL_MS = 2500;

async function loadProfileCached(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
): Promise<LoadedProfile | null> {
  const now = Date.now();
  if (
    loadCache.userId === userId &&
    loadCache.loaded &&
    now - loadCache.at < LOAD_TTL_MS
  ) {
    return loadCache.loaded;
  }
  if (loadCache.userId === userId && loadCache.inflight) {
    return loadCache.inflight;
  }
  const p = loadProfile(sb, userId).then((remote) => {
    loadCache.userId = userId;
    loadCache.at = Date.now();
    loadCache.loaded = remote;
    loadCache.inflight = null;
    return remote;
  });
  loadCache.userId = userId;
  loadCache.inflight = p;
  try {
    return await p;
  } catch (e) {
    loadCache.inflight = null;
    throw e;
  }
}

function invalidate(userId: string) {
  if (loadCache.userId === userId) {
    loadCache.at = 0;
    loadCache.loaded = null;
  }
}

/**
 * Supabase 로그인 시 원격 프로필과 동기화.
 *  - 원격에 데이터 있으면 → 원격을 로컬에 병합(로컬 전용 필드는 지키고 나머지는 원격 우선).
 *  - 원격 비었고 로컬에 데이터 있으면 → 로컬을 원격으로 이관(신규 로그인).
 *  - 이후 프로필 변경을 디바운스 저장. 저장이 실패하면 배너로 알리고 재시도를 제공한다.
 */
export function SyncManager() {
  const { configured, user } = useAuth();
  const replaceProfile = useProfile((s) => s.replaceProfile);
  const readyRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState<LoadedProfile | null>(null);
  const resolveRef = useRef<((merge: boolean) => void) | null>(null);

  /*
    id 만 본다. user 객체는 세션이 갱신될 때마다 새 객체가 되므로, 그대로 의존하면
    같은 사용자인데도 구독을 끊고 원격 프로필을 다시 불러온다.
  */
  const userId = user?.id ?? null;

  const retry = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    if (!readyRef.current) {
      invalidate(userId);
      setReload((n) => n + 1);
      return;
    }
    setRetrying(true);
    try {
      await saveProfile(sb, userId, useProfile.getState().profile);
      invalidate(userId);
      setSaveError(null);
      useSaveStatus.getState().markSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setRetrying(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!configured || !userId) {
      setConflict(null);
      setSaveError(null);
      readyRef.current = false;
      useSaveStatus.getState().setCloud(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      useSaveStatus.getState().setCloud(false);
      return;
    }

    useSaveStatus.getState().setCloud(true);
    setConflict(null);
    setSaveError(null);
    useSaveStatus.getState().markPending();
    let cancelled = false;
    readyRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSave = () => {
      if (!readyRef.current || cancelled) return;
      useSaveStatus.getState().markPending();
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (cancelled) return;
        useSaveStatus.getState().markSaving();
        try {
          const profile = useProfile.getState().profile;
          await saveProfile(sb, userId, profile);
          invalidate(userId); // 저장 후 캐시 무효화(다음 로드가 최신 반영)
          if (!cancelled) {
            setSaveError(null);
            useSaveStatus.getState().markSaved();
          }
        } catch (e) {
          console.error("[sync] save failed", e);
          if (!cancelled) {
            const msg = e instanceof Error ? e.message : "알 수 없는 오류";
            setSaveError(msg);
            useSaveStatus.getState().markError(msg);
          }
        }
      }, 1200);
    };

    const unsub = useProfile.subscribe((st, prev) => {
      if (st.profile !== prev.profile) scheduleSave();
    });

    (async () => {
      try {
        const remote = await loadProfileCached(sb, userId);
        if (cancelled) return;
        const local = useProfile.getState().profile;
        const plan = planInitialSync(remote, local);
        if (plan.kind === "choice") {
          const remote = plan.remote;
          setConflict(remote);
          useSaveStatus.getState().markPending();
          resolveRef.current = (merge) => {
            if (cancelled) return;
            const current = useProfile.getState().profile;
            const next = mergeRemoteIntoLocal(remote, current);
            if (merge)
              next.tracking = mergeTrackingByChoice(
                remote.profile.tracking,
                current.tracking,
              );
            try {
              replaceProfile(next);
              readyRef.current = true;
              setConflict(null);
              resolveRef.current = null;
              scheduleSave();
            } catch {
              setSaveError(
                "기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.",
              );
            }
          };
          return;
        }
        replaceProfile(plan.profile);
        if (!cancelled) {
          readyRef.current = true;
          scheduleSave();
        }
      } catch (e) {
        console.error("[sync] load failed", e);
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : "알 수 없는 오류");
          useSaveStatus.getState().markError("계정 기록 불러오기 실패");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
      resolveRef.current = null;
      readyRef.current = false;
      useSaveStatus.getState().setCloud(false);
    };
  }, [configured, userId, replaceProfile, reload]);

  if (conflict && userId)
    return (
      <div
        className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-xl rounded-xl border border-ink-300 bg-white p-5 shadow-lg"
        role="region"
        aria-label="계정 기록 확인"
      >
        <h2 className="font-semibold">기기와 계정의 루틴 기록이 달라요.</h2>
        <p className="mt-2 text-sm text-ink-600">
          선택 전에는 자동 저장을 잠시 멈춰요. 합치면 양쪽 루틴을 남기고, 같은
          루틴·날짜의 기록은 이 기기 값을 사용해요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="habit-primary"
            onClick={() => resolveRef.current?.(true)}
          >
            두 기록 합치기
          </button>
          <button
            className="habit-secondary"
            onClick={() => {
              if (
                window.confirm(
                  "이 기기의 루틴·목표·기록을 계정 기록으로 바꿀까요? 아직 백업하지 않은 기기 기록은 사라져요.",
                )
              )
                resolveRef.current?.(false);
            }}
          >
            계정 기록만 사용
          </button>
        </div>
        {saveError && (
          <p role="alert" className="mt-3 text-red-700">
            {saveError}
          </p>
        )}
      </div>
    );

  if (!saveError || !userId) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
        <Icon name="info" size={16} className="shrink-0 text-red-600" />
        <div className="min-w-0 flex-1 text-sm text-red-800">
          <span className="font-bold">클라우드 저장 실패</span> — 이 기기에는
          남아 있어요.
          <span className="mt-0.5 block text-xs text-red-700/80">
            {saveError}
          </span>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="min-h-11 shrink-0 rounded-lg bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {retrying ? "저장 중…" : "다시 저장"}
        </button>
      </div>
    </div>
  );
}
