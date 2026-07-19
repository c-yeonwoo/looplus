"use client";

import { INCOME_SOURCE_META, type IncomeSource } from "@/lib/types";
import { incomeSourceLabel } from "@/lib/income";
import { Field, NumberInput, Button, TextInput } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function IncomeHubInspector({
  monthlyIncome,
  onAddGroup,
}: {
  monthlyIncome: number;
  onAddGroup: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-bold text-ink-800">월수입</div>
        <p className="mt-1 text-xs text-ink-400">
          왼쪽 수입원이 여기로 모이고, 오른쪽 자산·지출로 흘러갑니다.
        </p>
      </div>
      <div className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-3 text-center">
        <div className="tnum text-xl font-extrabold text-brand-800">{monthlyIncome}만</div>
        <div className="mt-0.5 text-[11px] text-brand-500">이번 달 기준</div>
      </div>
      <Button className="w-full" onClick={onAddGroup}>
        <Icon name="plus" size={14} /> 묶음 추가
      </Button>
    </div>
  );
}

export function PoolHubInspector({
  cashflowMonthly = 0,
}: {
  /** 자산→월수입 재유입 추정(만원/월) */
  cashflowMonthly?: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-bold text-ink-800">자산</div>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">
          성장·안전 묶음이 모이는 곳입니다. <strong className="font-semibold text-ink-600">복리는 여기서만</strong>{" "}
          일어나고, 배당·임대 같은 현금흐름은 점선으로 월수입에 다시 들어옵니다.
        </p>
      </div>
      {cashflowMonthly > 0 && (
        <div className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-center">
          <div className="text-[11px] font-semibold text-gold-600">현금흐름(추정)</div>
          <div className="tnum text-lg font-extrabold text-ink-800">월 {Math.round(cashflowMonthly)}만</div>
        </div>
      )}
      <div className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-xs text-ink-500">
        지출은 자산에 들어가지 않고 아래 밴드로 빠져나갑니다.
      </div>
    </div>
  );
}

export function SourceInspector({
  source,
  onChange,
  onDelete,
  onMoveSibling,
}: {
  source: IncomeSource;
  onChange: (patch: Partial<IncomeSource>) => void;
  onDelete: () => void;
  onMoveSibling?: (dir: -1 | 1) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-bold text-ink-800">{incomeSourceLabel(source)}</div>
        <p className="mt-0.5 text-xs text-ink-400">{INCOME_SOURCE_META[source.type].hint}</p>
      </div>
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
      {onMoveSibling && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onMoveSibling(-1)}>
            위로
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onMoveSibling(1)}>
            아래로
          </Button>
        </div>
      )}
      <Button variant="danger" className="w-full" onClick={onDelete}>
        삭제
      </Button>
    </div>
  );
}
