"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import type { ReactNode } from "react";

const NAV = [
  { href: "/home", label: "홈", emoji: "🏠" },
  { href: "/engine", label: "엔진", emoji: "⚙️", core: true },
  { href: "/diagnosis", label: "진단", emoji: "📊" },
  { href: "/goals", label: "목표·비전", emoji: "🎯" },
  { href: "/spending", label: "지출관리", emoji: "💸", soon: true },
];

const LATER = [
  { label: "실천·트래킹", emoji: "✅" },
  { label: "커뮤니티", emoji: "👥" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl">
      {/* Sidebar (web) */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white/70 px-3 py-5 md:flex">
        <Link href="/home" className="mb-6 px-2 text-lg font-extrabold text-brand-700">
          ＄ 재테크 엔진
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) =>
            n.soon ? (
              <span
                key={n.href}
                className="flex cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400"
              >
                <span>{n.emoji}</span>
                {n.label}
                <span className="ml-auto text-[10px] text-slate-300">v1.5</span>
              </span>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive(n.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <span>{n.emoji}</span>
                {n.label}
                {n.core && (
                  <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                    핵심
                  </span>
                )}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-6 border-t border-slate-100 pt-4">
          {LATER.map((l) => (
            <div key={l.label} className="px-3 py-1.5 text-xs text-slate-300">
              {l.emoji} {l.label} (곧)
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">{children}</main>

      {/* Bottom tab (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        {NAV.filter((n) => !n.soon).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              isActive(n.href) ? "text-brand-700" : "text-slate-500",
            )}
          >
            <span className="text-lg">{n.emoji}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
