"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/store/useProfile";
import { loadProfile, saveProfile, profileHasData } from "@/lib/store/supabaseRepo";
import { mergeRemoteIntoLocal, type LoadedProfile } from "@/lib/store/mergeProfile";
import { Icon } from "@/components/Icon";

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
  if (loadCache.userId === userId && loadCache.loaded && now - loadCache.at < LOAD_TTL_MS) {
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

  const retry = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setRetrying(true);
    try {
      await saveProfile(sb, user.id, useProfile.getState().profile);
      invalidate(user.id);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setRetrying(false);
    }
  }, [user]);

  useEffect(() => {
    if (!configured || !user) return;
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    readyRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSave = () => {
      if (!readyRef.current || cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const profile = useProfile.getState().profile;
          await saveProfile(sb, user.id, profile);
          invalidate(user.id); // 저장 후 캐시 무효화(다음 로드가 최신 반영)
          if (!cancelled) setSaveError(null);
        } catch (e) {
          console.error("[sync] save failed", e);
          if (!cancelled) {
            setSaveError(e instanceof Error ? e.message : "알 수 없는 오류");
          }
        }
      }, 1200);
    };

    const unsub = useProfile.subscribe((st, prev) => {
      if (st.profile !== prev.profile) scheduleSave();
    });

    (async () => {
      try {
        const remote = await loadProfileCached(sb, user.id);
        if (cancelled) return;
        const local = useProfile.getState().profile;
        if (remote && profileHasData(remote.profile)) {
          replaceProfile(mergeRemoteIntoLocal(remote, local));
        } else if (profileHasData(local)) {
          await saveProfile(sb, user.id, local);
          invalidate(user.id);
        } else if (remote) {
          replaceProfile(mergeRemoteIntoLocal(remote, local));
        }
      } catch (e) {
        console.error("[sync] load failed", e);
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : "알 수 없는 오류");
        }
      } finally {
        readyRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
    };
  }, [configured, user?.id, replaceProfile]);

  if (!saveError) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
        <Icon name="info" size={16} className="shrink-0 text-red-600" />
        <div className="min-w-0 flex-1 text-sm text-red-800">
          <span className="font-bold">클라우드 저장 실패</span> — 이 기기에는 남아 있어요.
          <span className="mt-0.5 block text-xs text-red-700/80">{saveError}</span>
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
