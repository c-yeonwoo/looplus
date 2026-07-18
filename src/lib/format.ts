/**
 * 금액 포맷 유틸. 내부 단위는 항상 '만원'.
 */

/** 만원 값을 사람이 읽기 쉬운 '억/만' 문자열로. 예: 52000 -> "5.2억", 300 -> "300만" */
export function formatKRW(manwon: number): string {
  const v = Math.round(manwon);
  if (Math.abs(v) >= 10000) {
    const eok = v / 10000;
    // 소수 첫째자리까지, 정수면 정수로
    const s = eok >= 100 ? eok.toFixed(0) : eok.toFixed(1).replace(/\.0$/, "");
    return `${s}억`;
  }
  return `${v.toLocaleString("ko-KR")}만`;
}

/** 원 단위까지 상세 (툴팁 등) */
export function formatKRWLong(manwon: number): string {
  const won = Math.round(manwon) * 10000;
  return `${won.toLocaleString("ko-KR")}원`;
}

export function formatPct(pct: number, digits = 0): string {
  return `${pct.toFixed(digits)}%`;
}

/** 안전한 숫자 파싱 (빈값 -> 0) */
export function parseNum(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}
