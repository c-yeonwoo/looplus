import type { Profile } from "../types";
import {
  mergeRemoteIntoLocal,
  needsHabitMergeChoice,
  type LoadedProfile,
} from "./mergeProfile";
import { profileHasData } from "./supabaseRepo";

/** 빈 가입 계정은 충돌이 아니다. 금융을 포함한 기기 프로필 전체를 이관한다. */
export function planInitialSync(
  remote: LoadedProfile | null,
  local: Profile,
):
  | { kind: "choice"; remote: LoadedProfile }
  | { kind: "profile"; profile: Profile } {
  if (!remote || !profileHasData(remote.profile))
    return { kind: "profile", profile: local };
  if (needsHabitMergeChoice(remote.profile.tracking, local.tracking))
    return { kind: "choice", remote };
  return { kind: "profile", profile: mergeRemoteIntoLocal(remote, local) };
}
