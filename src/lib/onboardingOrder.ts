/**
 * 온보딩 스텝 순서 A/B.
 * - diagnosis_first (B→A→C): 기본 — 자기 파악 후 목표 (PRODUCT_REVIEW 권고)
 * - goals_first (A→B→C): 레거시
 *
 * 할당: env 강제 → 없으면 localStorage sticky → 없으면 70% diagnosis / 30% goals
 */

import type { IconName } from "@/components/Icon";

export type OnboardingOrder = "diagnosis_first" | "goals_first";

export type OnboardingStepKey = "goals" | "diagnosis" | "engine";

export interface OnboardingStepDef {
  key: OnboardingStepKey;
  label: string;
  icon: IconName;
  title: string;
  desc: string;
  nextLabel: string;
}

const LS_KEY = "looplus_onboarding_order";

const STEP_COPY: Record<
  OnboardingStepKey,
  Omit<OnboardingStepDef, "key"> & { key: OnboardingStepKey }
> = {
  diagnosis: {
    key: "diagnosis",
    label: "첫 숫자",
    icon: "diagnosis",
    title: "지금 내 위치를 확인해요",
    desc: "현금·투자·월수입·월지출 네 가지만 넣으면 첫 곡선을 만들 수 있어요.",
    nextLabel: "다음",
  },
  goals: {
    key: "goals",
    label: "첫 큰 루프",
    icon: "target",
    title: "첫 큰 루프를 열어요",
    desc: "어디까지 갈지 대략 잡고, 나중에 작은 루프로 쪼개 반복할 수 있어요.",
    nextLabel: "다음",
  },
  engine: {
    key: "engine",
    label: "자산 설계",
    icon: "engine",
    title: "돈이 도는 구조를 만들어요",
    desc: "추천 배분으로 첫 결과를 보고, 필요한 부분만 나중에 고치면 됩니다.",
    nextLabel: "완료 · 홈으로",
  },
};

export function stepsForOrder(order: OnboardingOrder): OnboardingStepDef[] {
  const mid =
    order === "diagnosis_first"
      ? [STEP_COPY.diagnosis, STEP_COPY.goals]
      : [STEP_COPY.goals, STEP_COPY.diagnosis];
  // 엔진 직전 CTA 라벨
  const beforeEngine = mid.map((s, i) =>
    i === mid.length - 1 ? { ...s, nextLabel: "자산 설계로" } : s,
  );
  return [...beforeEngine, STEP_COPY.engine];
}

function envForce(): OnboardingOrder | null {
  const v = process.env.NEXT_PUBLIC_ONBOARDING_ORDER?.trim();
  if (v === "diagnosis_first" || v === "goals_first") return v;
  return null;
}

function readSticky(): OnboardingOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "diagnosis_first" || v === "goals_first") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeSticky(order: OnboardingOrder): void {
  try {
    localStorage.setItem(LS_KEY, order);
  } catch {
    /* ignore */
  }
}

/** 브라우저당 1회 할당 후 sticky */
export function resolveOnboardingOrder(): OnboardingOrder {
  const forced = envForce();
  if (forced) return forced;

  const sticky = readSticky();
  if (sticky) return sticky;

  // 기본 편향: 진단 먼저 70%
  const order: OnboardingOrder =
    Math.random() < 0.7 ? "diagnosis_first" : "goals_first";
  writeSticky(order);
  return order;
}
