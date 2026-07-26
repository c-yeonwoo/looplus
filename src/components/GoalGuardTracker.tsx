"use client";

import { useEffect } from "react";
import { trackOncePerSession } from "@/lib/analytics";

/**
 * 목표 미설정 가드가 화면에 떴다는 사실만 기록한다.
 *
 * 가드 JSX 안에서 조건부로 렌더한다. 부모에서 `if (guard) useEffect(...)` 로 쓰면
 * 훅 순서가 렌더마다 달라지므로, 조건부 렌더가 허용되는 컴포넌트로 감쌌다.
 */
export function GoalGuardTracker({ surface }: { surface: "home" | "engine" }) {
  useEffect(() => {
    trackOncePerSession(`goal_guard_${surface}`, "goal_guard_shown", { surface });
  }, [surface]);
  return null;
}
