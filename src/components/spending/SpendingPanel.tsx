"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AssumptionNote } from "@/components/ui";
import { clsx } from "@/lib/clsx";
import { SummaryTab } from "./SummaryTab";
import { VariableTab } from "./VariableTab";
import { FixedTab } from "./FixedTab";

const TABS = [
  { key: "summary", label: "요약" },
  { key: "variable", label: "변동지출" },
  { key: "fixed", label: "고정지출" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SpendingPanel({ initialTab = "summary" }: { initialTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <div className="space-y-5">
      <div>
        <PageHeader
          icon="wallet"
          title="지출관리"
          desc="고정은 정해진 것 · 변동은 조절하는 레버. 예산은 변동에만 적용됩니다."
        />
        <div className="mt-4 flex gap-1 border-b border-ink-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "relative px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === t.key ? "text-ink-900" : "text-ink-400 hover:text-ink-600",
              )}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gold-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "summary" && <SummaryTab />}
      {tab === "variable" && <VariableTab />}
      {tab === "fixed" && <FixedTab />}

      <AssumptionNote>
        지출 기록·또래 비교·페이스 투영은 모두 예시·가정일 수 있습니다. 엔진 자동 연동은 이후
        버전에서 연결됩니다.
      </AssumptionNote>
    </div>
  );
}
