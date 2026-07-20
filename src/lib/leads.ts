/**
 * 리드젠 / 크로스셀 URL 해석.
 * NEXT_PUBLIC_LEAD_URL 이 기본. 도구별 오버라이드 가능.
 */

export type LinkedToolId = "signal_desk" | "signal_apt";

export interface LinkedToolMeta {
  id: LinkedToolId;
  label: string;
  blurb: string;
}

export const LINKED_TOOLS: Record<LinkedToolId, LinkedToolMeta> = {
  signal_desk: {
    id: "signal_desk",
    label: "Signal Desk",
    blurb: "주식·ETF 배분을 실행 가이드로 이어가요",
  },
  signal_apt: {
    id: "signal_apt",
    label: "Signal APT",
    blurb: "부동산 비중을 점검하는 다음 단계",
  },
};

const LEGACY_LABEL: Record<string, LinkedToolId> = {
  "Signal Desk (v2)": "signal_desk",
  "Signal APT (v2)": "signal_apt",
  "Signal Desk": "signal_desk",
  "Signal APT": "signal_apt",
};

export function isLeadConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LEAD_URL?.trim());
}

export function baseLeadUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_LEAD_URL?.trim();
  return u || null;
}

/** 도구별 env → 없으면 LEAD_URL?tool= */
export function resolveLeadUrl(toolId?: LinkedToolId | null): string | null {
  if (toolId === "signal_desk") {
    const specific = process.env.NEXT_PUBLIC_LEAD_URL_SIGNAL_DESK?.trim();
    if (specific) return specific;
  }
  if (toolId === "signal_apt") {
    const specific = process.env.NEXT_PUBLIC_LEAD_URL_SIGNAL_APT?.trim();
    if (specific) return specific;
  }
  const base = baseLeadUrl();
  if (!base) return null;
  if (!toolId) return base;
  try {
    const u = new URL(base);
    u.searchParams.set("tool", toolId);
    u.searchParams.set("utm_source", "looplus");
    u.searchParams.set("utm_medium", "in_app");
    u.searchParams.set("utm_campaign", toolId);
    return u.toString();
  } catch {
    return base;
  }
}

/** catalog / persist 의 linkedTool 문자열 → 메타 */
export function resolveLinkedTool(raw?: string | null): LinkedToolMeta | null {
  if (!raw) return null;
  if (raw in LINKED_TOOLS) return LINKED_TOOLS[raw as LinkedToolId];
  const id = LEGACY_LABEL[raw];
  if (id) return LINKED_TOOLS[id];
  return null;
}
