"use client";

import {
  INCOME_SOURCE_META,
  type Bucket,
  type FinancialSnapshot,
  type IncomeSource,
} from "@/lib/types";
import { incomeSourceLabel } from "@/lib/income";
import {
  assetLeaves,
  bucketBalance,
  bucketsRealizedAnnual,
  residualTotal,
  seedBalancesFromSnapshot,
  totalBucketBalances,
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
 * 자산 현황 허브 — 각 버킷에 모아 둔 돈 + 거기서 나오는 현금흐름.
 */
export function PoolHubInspector({
  buckets,
  snapshot,
  onChangeBuckets,
  onOpenDiagnosis,
  onSelectBucket,
}: {
  buckets: Bucket[];
  snapshot: FinancialSnapshot;
  onChangeBuckets: (next: Bucket[]) => void;
  onOpenDiagnosis?: () => void;
  onSelectBucket?: (id: string) => void;
}) {
  const leaves = assetLeaves(buckets);
  const total = totalBucketBalances(buckets);
  const leftover = residualTotal(snapshot, buckets);
  const monthly = bucketsRealizedAnnual(buckets) / 12;

  const setBalance = (id: string, value: number) => {
    onChangeBuckets(
      buckets.map((b) =>
        b.id === id ? { ...b, currentBalance: Math.max(0, value) } : b,
      ),
    );
  };

  const fillFromDiagnosis = () => {
    onChangeBuckets(seedBalancesFromSnapshot(buckets, snapshot));
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-ink-800">자산 현황</div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2.5 text-center">
        <div>
          <div className="text-[11px] font-semibold text-sage-600">버킷에 모은 돈</div>
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
        각 항목에 지금 얼마가 있는지를 적어요. 배당·임대는 다음 해 수입으로 자동 반영됩니다.
      </p>

      {leaves.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-xs text-ink-400">
          투자·저축 항목을 추가하면 여기에 보유액을 넣을 수 있어요
        </div>
      ) : (
        <div className="space-y-2">
          {leaves.map((b) => (
            <div key={b.id} className="rounded-xl border border-ink-100 px-3 py-2.5">
              <button
                type="button"
                className="mb-1.5 flex w-full items-center justify-between text-left"
                onClick={() => onSelectBucket?.(b.id)}
              >
                <span className="text-sm font-semibold text-ink-700">{b.name}</span>
                <span className="text-[10px] font-medium text-ink-400">
                  {b.category === "invest" ? (b.isLocked ? "잠금" : "투자") : "저축"}
                </span>
              </button>
              <NumberInput
                value={bucketBalance(b)}
                onChange={(n) => setBalance(b.id, n)}
                suffix="만원"
              />
            </div>
          ))}
        </div>
      )}

      {leftover > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-800">
            현황에만 있고 버킷에 안 넣은 금액이{" "}
            <span className="tnum font-bold">{Math.round(leftover)}만</span> 있어요.
          </p>
          <Button variant="outline" className="w-full !py-1.5 !text-xs" onClick={fillFromDiagnosis}>
            버킷 비율대로 나눠 넣기
          </Button>
        </div>
      )}

      {onOpenDiagnosis && (
        <Button variant="outline" className="w-full" onClick={onOpenDiagnosis}>
          현황 전체 수정
        </Button>
      )}
    </div>
  );
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
