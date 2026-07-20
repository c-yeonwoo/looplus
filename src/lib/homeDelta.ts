/**
 * 홈 주간 앵커 — 순자산·달성률·단계의 주간 변화.
 * localStorage만 사용 (프로필 sync 부담 없이 리텐션 훅).
 */

export interface WeekAnchor {
  weekKey: string; // 월요일 YYYY-MM-DD
  netWorth: number;
  achievementPct: number;
  stage: number;
  at: string; // ISO
}

export interface WeekDelta {
  netWorthDelta: number;
  achievementDeltaPp: number;
  stageDelta: number;
  /** 이번 주 첫 방문이면 true (비교 기준 없음) */
  isNewWeek: boolean;
  previous: WeekAnchor | null;
}

const LS_KEY = "looplus_home_week_anchor";

/** 주 키 — 해당 주 월요일 YYYY-MM-DD */
export function weekKey(d: Date = new Date()): string {
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readAnchor(): WeekAnchor | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeekAnchor;
  } catch {
    return null;
  }
}

function writeAnchor(a: WeekAnchor): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(LS_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

/**
 * 현재 지표를 기준으로 주간 델타를 계산하고, 주가 바뀌면 앵커를 갱신.
 * 같은 주 안에서는 주초 앵커와 비교(첫 기록 유지).
 */
export function computeWeekDelta(input: {
  netWorth: number;
  achievementPct: number;
  stage: number;
  now?: Date;
}): WeekDelta {
  const now = input.now ?? new Date();
  const key = weekKey(now);
  const prev = readAnchor();

  if (!prev || prev.weekKey !== key) {
    const next: WeekAnchor = {
      weekKey: key,
      netWorth: input.netWorth,
      achievementPct: input.achievementPct,
      stage: input.stage,
      at: now.toISOString(),
    };
    writeAnchor(next);
    return {
      netWorthDelta: 0,
      achievementDeltaPp: 0,
      stageDelta: 0,
      isNewWeek: true,
      previous: prev,
    };
  }

  return {
    netWorthDelta: input.netWorth - prev.netWorth,
    achievementDeltaPp: input.achievementPct - prev.achievementPct,
    stageDelta: input.stage - prev.stage,
    isNewWeek: false,
    previous: prev,
  };
}
