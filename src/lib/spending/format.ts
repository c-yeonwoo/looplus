/** 원 → 표시. 1만 이상이면 "1.4만", 아니면 "4,500원" */
export function formatWon(won: number): string {
  const v = Math.round(won);
  if (Math.abs(v) >= 10_000) {
    const man = v / 10_000;
    const s = man >= 100 ? man.toFixed(0) : man.toFixed(1).replace(/\.0$/, "");
    return `${s}만`;
  }
  return `${v.toLocaleString("ko-KR")}원`;
}

export function formatWonFull(won: number): string {
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

/** YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${year}년 ${monthIndex + 1}월`;
}

export function weekdayShort(d: Date): string {
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}
