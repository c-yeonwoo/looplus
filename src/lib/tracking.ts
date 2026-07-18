/**
 * 주간 점검 스트릭 계산 (F 실천·트래킹).
 * 주 버킷 = 월요일 기준 주 인덱스. 연속 주 수를 센다.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 월요일 기준 주 인덱스 */
export function weekIndex(dateISO: string | number | Date): number {
  const d = new Date(dateISO);
  const day = (d.getDay() + 6) % 7; // 월=0 … 일=6
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / WEEK_MS);
}

export function hasCheckedInThisWeek(checkIns: string[], now: Date = new Date()): boolean {
  const cur = weekIndex(now);
  return checkIns.some((c) => weekIndex(c) === cur);
}

/** 이번 주(또는 지난 주)부터 연속으로 점검한 주 수 */
export function computeStreak(checkIns: string[], now: Date = new Date()): number {
  if (checkIns.length === 0) return 0;
  const weeks = new Set(checkIns.map((c) => weekIndex(c)));
  const cur = weekIndex(now);
  let start: number;
  if (weeks.has(cur)) start = cur;
  else if (weeks.has(cur - 1)) start = cur - 1;
  else return 0;
  let streak = 0;
  let w = start;
  while (weeks.has(w)) {
    streak += 1;
    w -= 1;
  }
  return streak;
}
