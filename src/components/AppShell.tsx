"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { AccountMenu } from "./AccountMenu";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  core?: boolean;
};

/** 플랫 메뉴 — 전문 용어·그룹 라벨 없이 */
const NAV: NavItem[] = [
  { href: "/home", label: "홈", icon: "home" },
  { href: "/engine", label: "자산 설계", icon: "engine", core: true },
  { href: "/goals", label: "목표", icon: "target" },
  { href: "/diagnosis", label: "진단", icon: "diagnosis" },
  { href: "/tracking", label: "실천", icon: "check-circle" },
  { href: "/spending", label: "지출", icon: "wallet" },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/home", label: "홈", icon: "home" },
  { href: "/spending", label: "지출", icon: "wallet" },
  { href: "/engine", label: "설계", icon: "engine", core: true },
  { href: "/tracking", label: "실천", icon: "check-circle" },
  { href: "/goals", label: "목표", icon: "target" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="flex min-h-screen w-full">
      {/* 좌측 끝 풀블리드 */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-200 bg-white px-3 py-5 md:flex lg:w-60">
        <Link href="/home" className="mb-6 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
                isActive(n.href)
                  ? "bg-gold-50 font-semibold text-gold-600"
                  : "font-medium text-ink-600 hover:bg-ink-100",
              )}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-ink-100 pt-3">
          <div className="flex flex-wrap gap-x-2 gap-y-1 px-2 text-[11px] text-ink-400">
            <Link href="/legal/disclaimer" className="hover:text-ink-600">
              투자 고지
            </Link>
            <Link href="/legal/terms" className="hover:text-ink-600">
              약관
            </Link>
            <Link href="/legal/privacy" className="hover:text-ink-600">
              개인정보
            </Link>
          </div>
          <AccountMenu />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 pb-24 pt-5 md:px-8 md:pb-10 lg:px-10">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-ink-200 bg-white/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? "page" : undefined}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              isActive(n.href) ? "font-semibold text-gold-600" : "text-ink-500",
            )}
          >
            <Icon name={n.icon} size={20} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
