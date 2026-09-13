"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { HydrationGate } from "@/components/HydrationGate";
import { Providers } from "@/components/Providers";
import { LogoMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/store/useProfile";
import { BRAND } from "@/lib/brand";

function LoginInner() {
  const { user, configured, loading, continueAsGuest } = useAuth();
  const router = useRouter();
  const onboardedAt = useProfile((s) => s.profile.onboardedAt);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(onboardedAt ? "/home" : "/onboarding");
  }, [user, loading, onboardedAt, router]);

  const subtitle = configured
    ? "이메일·비밀번호로 로그인 · 클라우드 저장"
    : "지금은 이 기기에 저장됩니다";

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      {/* 브랜드 패널 — 모바일: 상단 스트립 / 데스크톱: 좌측 고정 */}
      <div className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-brand-900 px-6 py-8 text-white md:w-[44%] md:min-h-dvh md:px-12 md:py-14 lg:w-1/2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl md:h-96 md:w-96"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-lg text-white">{BRAND.mark}</span>
        </div>

        <div className="relative mt-8 md:mt-0">
          <h1 className="font-display max-w-sm text-2xl leading-tight text-white md:text-[34px]">
            돈을 돌릴수록
            <br />
            자산이 더해지는 루프
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55 md:mt-4 md:text-[15px]">
            목표와 지금 위치를 넣으면, 몇 년 뒤 자산 곡선을 미리 봅니다.
          </p>
        </div>

        <div className="relative hidden items-center gap-1.5 text-xs text-white/40 md:flex">
          <Icon name="info" size={13} />
          모든 수치는 예시·가정이며 수익을 보장하지 않습니다.
        </div>
      </div>

      {/* 폼 패널 */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 hidden md:block">
            <div className="font-display text-xl text-ink-900">시작하기</div>
            <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          </div>
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div>
              <div className="font-display text-lg text-ink-900">시작하기</div>
              <p className="text-xs text-ink-500">{subtitle}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
            <AuthForm
              onSuccess={() => router.replace(onboardedAt ? "/home" : "/onboarding")}
            />
          </div>
          {configured && (
            <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3">
              <div className="text-xs font-bold text-ink-700">먼저 내 루프를 그려보고 싶다면</div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                계정 없이 첫 곡선과 큰 루프를 만들어 볼 수 있어요. 내용은 이 기기에만 저장되며,
                나중에 가입하면 백업할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  continueAsGuest();
                  router.replace(onboardedAt ? "/home" : "/onboarding");
                }}
                className="mt-2 text-xs font-bold text-gold-600 hover:underline"
              >
                계정 없이 첫 곡선 보기 →
              </button>
            </div>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400 md:hidden">
            <Icon name="info" size={13} />
            모든 수치는 예시·가정이며 수익을 보장하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <HydrationGate>
      <Providers>
        <LoginInner />
      </Providers>
    </HydrationGate>
  );
}
