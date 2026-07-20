"use client";

import { track } from "@/lib/analytics";
import { resolveLeadUrl, type LinkedToolId } from "@/lib/leads";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";

type Placement =
  | "engine_result"
  | "engine_after_share"
  | "home_retention"
  | "inspector_tool"
  | string;

const COPY: Record<string, { title: string; body: string; cta: string }> = {
  engine_result: {
    title: "이 배분을 실행으로 옮길까요?",
    body: "구조를 실제로 옮기는 가이드로 이어져요. 종목·매물 추천은 하지 않아요.",
    cta: "실행 가이드 보기",
  },
  engine_after_share: {
    title: "공유했어요 · 다음은 실행",
    body: "그래프만으로 끝내지 말고, 이번 주 할 일로 연결해 보세요.",
    cta: "다음 단계 보기",
  },
  home_retention: {
    title: "이번 주, 한 걸음만",
    body: "배분이 정해졌다면 실행 체크리스트로 넘어갈 수 있어요.",
    cta: "가이드 열기",
  },
  inspector_tool: {
    title: "연결 도구",
    body: "이 항목과 맞는 실행 가이드",
    cta: "알아보기",
  },
};

/**
 * 리드젠 CTA (BM 1차).
 * URL 없으면 자리 유지 + 클릭 계측만.
 */
export function LeadCta({
  placement,
  toolId,
  title,
  body,
  className = "",
  compact = false,
}: {
  placement: Placement;
  toolId?: LinkedToolId | null;
  title?: string;
  body?: string;
  className?: string;
  compact?: boolean;
}) {
  const url = resolveLeadUrl(toolId);
  const copy = COPY[placement] ?? COPY.engine_result;
  const t = title ?? copy.title;
  const b = body ?? copy.body;
  const cta = url ? copy.cta : "곧 연결";

  const onClick = () => {
    track("lead_cta_clicked", {
      placement,
      has_url: Boolean(url),
      tool: toolId ?? null,
    });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-left transition-colors hover:bg-gold-100 ${className}`}
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold text-ink-800">{t}</span>
          <span className="block text-[11px] text-ink-500">{b}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-gold-600">
          {cta} <Icon name="arrow-right" size={12} className="inline" />
        </span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink-800">{t}</div>
          <p className="mt-0.5 text-xs text-ink-500">{b}</p>
        </div>
        <Button onClick={onClick} className="shrink-0">
          {url ? (
            <>
              {cta} <Icon name="arrow-right" size={14} />
            </>
          ) : (
            <>곧 연결</>
          )}
        </Button>
      </div>
    </div>
  );
}
