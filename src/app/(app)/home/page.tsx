"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store/useProfile";
import { useDerived } from "@/lib/useDerived";
import { STAGE_NAMES } from "@/lib/engine";
import { formatKRW, formatPct } from "@/lib/format";
import { Card, StatCard, Button, EmptyState, Badge } from "@/components/ui";
import { AssetChart } from "@/components/AssetChart";

export default function HomePage() {
  const profile = useProfile((s) => s.profile);
  const { stage, projection } = useDerived();
  const { vision, snapshot } = profile;

  if (!snapshot || !stage) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-extrabold text-slate-800">🏠 홈</h1>
        <EmptyState
          emoji="👋"
          title="먼저 진단으로 현재 위치를 확인해요"
          desc="자산·소득을 입력하면 8단계 중 내 위치와 엔진 출발점이 만들어집니다."
          action={
            <Link href="/onboarding">
              <Button>시작하기</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const m = stage.metrics;
  const targetYears = vision?.targetYears ?? 15;
  const whyLine = vision?.why?.trim();
  const firstScene = vision?.scenes.find((s) => s.text.trim());

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-slate-800">🏠 홈 · 안녕하세요 👋</h1>

      {/* Hero */}
      <Card className="border-brand-200 bg-brand-50">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs text-brand-500">현재 위치</div>
            <div className="mt-1 text-2xl font-extrabold text-brand-700">
              {stage.stage} / 8 단계 · {STAGE_NAMES[stage.stage]}
            </div>
            {(whyLine || firstScene) && (
              <div className="mt-1 text-sm text-brand-600">
                🎯 {whyLine || firstScene?.text}
                {vision && ` — 목표 순자산 ${formatKRW(vision.goalNetworth)}`}
              </div>
            )}
          </div>
          {vision && projection && (
            <div className="flex gap-6 border-t border-brand-200 pt-3 sm:border-l sm:border-t-0 sm:pt-0 sm:pl-6">
              <div>
                <div className="text-[11px] text-brand-400">목표 대비</div>
                <div className="text-xl font-bold text-brand-700">
                  {formatPct(projection.achievementPct, 1)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-brand-400">예상 ETA</div>
                <div className="text-xl font-bold text-brand-700">
                  {projection.targetReachYear != null
                    ? `약 ${projection.targetReachYear}년`
                    : "재조정 필요"}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 엔진 미니뷰 */}
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700">📈 엔진 미리보기 ({targetYears}년 자산)</div>
            <Link href="/engine">
              <Button className="!py-1.5 !text-xs">엔진 열기 →</Button>
            </Link>
          </div>
          {projection && profile.engine.buckets.length > 0 ? (
            <AssetChart
              curve={projection.curve}
              goalNetworth={vision?.goalNetworth}
              targetReachYear={projection.targetReachYear}
              height={200}
              compact
            />
          ) : (
            <EmptyState
              emoji="⚙️"
              title="아직 엔진이 비어 있어요"
              desc="버킷을 조립하면 n년 뒤 자산 곡선이 보입니다."
              action={
                <Link href="/engine">
                  <Button>엔진 만들기</Button>
                </Link>
              }
            />
          )}
        </Card>

        {/* 다음 한 걸음 */}
        <Card className="border-amber-200 bg-amber-50">
          <div className="text-sm font-bold text-amber-800">✅ 다음 한 걸음</div>
          <p className="mt-2 text-sm text-amber-700">{stage.nextStep}</p>
          <Link href="/diagnosis">
            <Button variant="outline" className="mt-4 w-full border-amber-300 text-amber-800">
              진단 업데이트
            </Button>
          </Link>
        </Card>
      </div>

      {/* 자산·현금흐름 요약 */}
      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">자산 · 현금흐름 요약</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="순자산" value={formatKRW(m.netWorth)} />
          <StatCard label="저축률" value={formatPct(Math.max(0, m.savingsRatePct))} />
          <StatCard
            label="소득구조 (근로:자본)"
            value={`${Math.round(m.laborSharePct)}:${Math.round(m.capitalSharePct)}`}
          />
          <StatCard label="passive / 생활비" value={formatPct(m.passiveToSpendingPct)} />
        </div>
      </div>

      {/* 바로가기 */}
      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">바로가기</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { href: "/engine", label: "⚙️ 엔진" },
            { href: "/diagnosis", label: "📊 진단 수정" },
            { href: "/goals", label: "🎯 목표 수정" },
            { href: "/spending", label: "💸 지출관리" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        홈 = &quot;지금 어디 · 목표까지 얼마 · 언제 · 다음 뭐&quot; 한 화면 · 모든 수치는 예시·가정
      </p>
    </div>
  );
}
