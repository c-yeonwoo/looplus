"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/store/useProfile";
import { loadProfile, saveProfile, profileHasData } from "@/lib/store/supabaseRepo";
import type { Profile } from "@/lib/types";

/** 동일 유저 짧은 재마운트·StrictMode 이중 호출 시 중복 GET 방지 */
const loadCache: {
  userId: string | null;
  at: number;
  profile: Profile | null;
  inflight: Promise<Profile | null> | null;
} = { userId: null, at: 0, profile: null, inflight: null };

const LOAD_TTL_MS = 2500;

async function loadProfileCached(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
): Promise<Profile | null> {
  const now = Date.now();
  if (
    loadCache.userId === userId &&
    loadCache.profile &&
    now - loadCache.at < LOAD_TTL_MS
  ) {
    return loadCache.profile;
  }
  if (loadCache.userId === userId && loadCache.inflight) {
    return loadCache.inflight;
  }
  const p = loadProfile(sb, userId).then((remote) => {
    loadCache.userId = userId;
    loadCache.at = Date.now();
    loadCache.profile = remote;
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

/**
 * Supabase 로그인 시 원격 프로필과 동기화.
 *  - 원격에 데이터 있으면 → 스토어를 원격으로 교체.
 *  - 원격 비었고 로컬에 데이터 있으면 → 로컬을 원격으로 이관(신규 로그인).
 *  - 이후 프로필 변경을 디바운스 저장.
 */
export function SyncManager() {
  const { configured, user } = useAuth();
  const replaceProfile = useProfile((s) => s.replaceProfile);
  const readyRef = useRef(false);

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
          // 저장 후 캐시 무효화(다음 로드가 최신 반영)
          if (loadCache.userId === user.id) {
            loadCache.at = 0;
            loadCache.profile = null;
          }
        } catch (e) {
          console.error("[sync] save failed", e);
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
        if (remote && profileHasData(remote)) {
          replaceProfile(remote);
        } else if (profileHasData(local)) {
          await saveProfile(sb, user.id, local);
          loadCache.at = 0;
          loadCache.profile = null;
        } else if (remote) {
          replaceProfile(remote);
        }
      } catch (e) {
        console.error("[sync] load failed", e);
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

  return null;
}
