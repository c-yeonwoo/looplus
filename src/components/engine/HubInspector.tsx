"use client";

import {
  INCOME_SOURCE_META,
  type FinancialSnapshot,
  type HoldingKind,
  type HoldingReturn,
  type HoldingReturns,
  type IncomeSource,
} from "@/lib/types";
import { incomeSourceLabel } from "@/lib/income";
import {
  HOLDING_KINDS,
  HOLDING_META,
  holdingBalance,
  holdingsRealizedAnnual,
  totalHoldings,
} from "@/lib/engine/holdings";
import { Field, NumberInput, Button, TextInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function IncomeHubInspector({
  monthlyIncome,
  showIncomeSources = true,
  onShowIncomeSourcesChange,
  onAddGroup,
  structureEditable = true,
}: {
  monthlyIncome: number;
  /** 캔버스 수입원 노드 표시 */
  showIncomeSources?: boolean;
  onShowIncomeSourcesChange?: (show: boolean) => void;
  onAddGroup: () => void;
  structureEditable?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-ink-800">월수입</div>
      <div className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-3 text-center">
        <div className="tnum text-xl font-extrabold text-gold-700">{monthlyIncome}만</div>
        <div className="mt-0.5 text-[11px] text-gold-500">이번 달 기준</div>
      </div>
      {structureEditable && onShowIncomeSourcesChange && (
        <label className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2.5 text-sm">
          <span className="text-ink-700">
            <span className="font-semibold">수입원 표시</span>
            <span className="mt-0.5 block text-[11px] font-normal text-ink-400">
              캔버스 왼쪽 수입 노드 on/off
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-700"
            checked={showIncomeSources}
            onChange={(e) => onShowIncomeSourcesChange(e.target.checked)}
          />
        </label>
      )}
      {structureEditable && (
        <Button className="w-full" onClick={onAddGroup}>
          <Icon name="plus" size={14} /> 묶음 추가
        </Button>
      )}
    </div>
  );
}

/**
 * 보유 자산 노드.
 * 이미 가진 돈(현금·투자자산·부동산)의 금액과 수익 가정을 한곳에서 다룬다.
 * 여기서 나오는 실현 수익은 프로젝션이 매년 자본소득으로 자동 재유입한다.
 */
export function PoolHubInspector({
  snapshot,
  returns,
  onChangeSnapshot,
  onChangeReturns,
  onOpenDiagnosis,
}: {
  snapshot: FinancialSnapshot;
  returns: HoldingReturns;
  onChangeSnapshot: (patch: Partial<FinancialSnapshot>) => void;
  onChangeReturns: (next: HoldingReturns) => void;
  onOpenDiagnosis?: () => void;
}) {
  const total = totalHoldings(snapshot);
  const monthly = holdingsRealizedAnnual(snapshot, returns) / 12;
  const patchKind = (kind: HoldingKind, patch: Partial<HoldingReturn>) => {
    const merged = { ...returns[kind], ...patch };
    onChangeReturns({
      ...returns,
      // 현금으로 나오는 몫이 총수익을 넘을 수 없다
      [kind]: {
        ...merged,
        realizedYieldPct: Math.min(merged.realizedYieldPct, merged.expectedAnnualReturnPct),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-ink-800">보유 자산</div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2.5 text-center">
        <div>
          <div className="text-[11px] font-semibold text-sage-600">지금 보유</div>
          <div className="tnum text-base font-extrabold text-sage-700">{Math.round(total)}만</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-sage-600">여기서 나오는 현금</div>
          <div className="tnum text-base font-extrabold text-sage-700">
            월 {Math.round(monthly)}만
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-400">
        배당·임대·이자로 나오는 몫은 다음 해 수입에 자동으로 더해져 다시 배분돼요.
      </p>

      {HOLDING_KINDS.map((kind) => {
        const meta = HOLDING_META[kind];
        const ret = returns[kind];
        return (
          <div key={kind} className="space-y-2 rounded-xl border border-ink-100 px-3 py-2.5">
            <Field label={meta.label}>
              <NumberInput
                value={holdingBalance(snapshot, kind)}
                onChange={(n) => onChangeSnapshot(snapshotPatch(kind, Math.max(0, n)))}
                suffix="만원"
              />
            </Field>
            {/* grid 자식은 기본 min-width:auto 라 좁은 패널에서 넘친다 */}
            <div className="grid min-w-0 grid-cols-2 gap-2 [&>label]:min-w-0">
              <Field label="기대 수익률">
                <NumberInput
                  value={ret.expectedAnnualReturnPct}
                  onChange={(n) => patchKind(kind, { expectedAnnualReturnPct: clampPct(n) })}
                  suffix="%"
                  showZero
                />
              </Field>
              <Field label={`현금(${meta.hint})`}>
                <NumberInput
                  value={ret.realizedYieldPct}
                  onChange={(n) => patchKind(kind, { realizedYieldPct: clampPct(n) })}
                  suffix="%"
                  showZero
                />
              </Field>
            </div>
          </div>
        );
      })}

      {onOpenDiagnosis && (
        <Button variant="outline" className="w-full" onClick={onOpenDiagnosis}>
          현황 전체 수정
        </Button>
      )}
    </div>
  );
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function snapshotPatch(kind: HoldingKind, value: number): Partial<FinancialSnapshot> {
  if (kind === "cash") return { cash: value };
  if (kind === "invest") return { investAssets: value };
  return { realEstate: value };
}

export function SourceInspector({
  source,
  onChange,
  onDelete,
  onMoveSibling,
  structureEditable = true,
}: {
  source: IncomeSource;
  onChange: (patch: Partial<IncomeSource>) => void;
  onDelete: () => void;
  onMoveSibling?: (dir: -1 | 1) => void;
  structureEditable?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-ink-800">{incomeSourceLabel(source)}</div>
      <Field label="표시 이름">
        <TextInput
          value={source.name ?? ""}
          onChange={(v) => onChange({ name: v })}
          placeholder={INCOME_SOURCE_META[source.type].label}
        />
      </Field>
      <Field label="월 금액">
        <NumberInput
          value={source.monthly}
          onChange={(n) => onChange({ monthly: Math.max(0, n) })}
          suffix="만원"
        />
      </Field>
      {structureEditable && onMoveSibling && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onMoveSibling(-1)}>
            위로
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onMoveSibling(1)}>
            아래로
          </Button>
        </div>
      )}
      {structureEditable && (
        <Button variant="danger" className="w-full" onClick={onDelete}>
          삭제
        </Button>
      )}
    </div>
  );
}
