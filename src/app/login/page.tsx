"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { HydrationGate } from "@/components/HydrationGate";
import { Providers } from "@/components/Providers";
import { LogoMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

function LoginInner() {
  const { user, configured, loading, continueAsGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/home");
  }, [user, loading, router]);

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
            작은 실천이 모여
            <br />
            나다운 일상으로
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55 md:mt-4 md:text-[15px]">
            나에게 맞는 루틴을 고르고, 오늘의 실천을 기록하며 이어가요.
          </p>
        </div>

        <div className="relative hidden items-center gap-1.5 text-xs text-white/40 md:flex">
          <Icon name="info" size={13} />
          기록은 가입 없이 시작할 수 있어요.
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
              onSuccess={() => router.replace("/home")}
            />
          </div>
          {configured && (
            <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3">
              <div className="text-xs font-bold text-ink-700">가입 없이 시작하고 싶다면</div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                계정 없이 루틴을 만들고 기록할 수 있어요. 내용은 이 기기에만 저장되며,
                나중에 가입하면 백업할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  continueAsGuest();
                  router.replace("/home");
                }}
                className="mt-2 text-xs font-bold text-gold-600 hover:underline"
              >
                가입 없이 루틴 시작하기 →
              </button>
            </div>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400 md:hidden">
            <Icon name="info" size={13} />
            기기 기록은 브라우저 데이터를 지우면 사라질 수 있어요.
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
