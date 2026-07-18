"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/store/useProfile";
import { HydrationGate } from "@/components/HydrationGate";
import { GoalsPanel } from "@/components/panels/GoalsPanel";
import { DiagnosisPanel } from "@/components/panels/DiagnosisPanel";
import { EngineBuilder } from "@/components/engine/EngineBuilder";
import { Button } from "@/components/ui";
import { clsx } from "@/lib/clsx";

const STEPS = [
  { key: "goals", label: "목표·비전", emoji: "🎯" },
  { key: "diagnosis", label: "현재 진단", emoji: "📊" },
  { key: "engine", label: "엔진 구성", emoji: "⚙️" },
];

function OnboardingInner() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const completeOnboarding = useProfile((s) => s.completeOnboarding);

  const finish = () => {
    completeOnboarding();
    router.push("/home");
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8">
      {/* Stepper */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-lg font-extrabold text-brand-700">＄ 재테크 엔진</div>
        <button onClick={finish} className="text-xs text-slate-400 hover:text-slate-600">
          나중에 채우기 · 건너뛰기 →
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              <span>{s.emoji}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="mb-6">
        {step === 0 && (
          <>
            <StepHeader
              title="① 미래의 나를 그려요"
              desc="왜 경제적 자유를 원하는지, 얼마를 언제까지. 목표는 언제든 수정할 수 있어요."
            />
            <GoalsPanel />
          </>
        )}
        {step === 1 && (
          <>
            <StepHeader
              title="② 지금 내 위치를 확인해요"
              desc="최소만 입력해도 됩니다. 이 데이터는 엔진과 그대로 공유돼요."
            />
            <DiagnosisPanel />
          </>
        )}
        {step === 2 && (
          <>
            <StepHeader
              title="③ 내 엔진을 조립해요"
              desc="팔레트에서 버킷을 끌어다 배분하면 n년 뒤 자산이 바로 보입니다."
            />
            <EngineBuilder />
          </>
        )}
      </div>

      {/* Nav */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          ← 이전
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            {step === 0 ? "이 목표로 시작하기" : "이 데이터로 엔진 구성"} →
          </Button>
        ) : (
          <Button onClick={finish}>완료 · 홈으로 →</Button>
        )}
      </div>
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-extrabold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <HydrationGate>
      <OnboardingInner />
    </HydrationGate>
  );
}
