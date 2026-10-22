"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";
import { Icon, type IconName } from "./Icon";
import { Logo, LogoMark } from "./Logo";
import { AccountMenu } from "./AccountMenu";
import { SaveStatusChip } from "./SaveStatus";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  core?: boolean;
};

/** 일상 실천을 위한 세 탭. 금융은 프로필의 선택형 도구로 이동한다. */
const NAV: NavItem[] = [
  { href: "/home", label: "오늘", icon: "home" },
  { href: "/goals", label: "목표", icon: "target" },
  { href: "/records", label: "기록", icon: "calendar" },
];
/** NAV 배열에서 1차(홈·설계·루틴) 개수 — 이후는 구분선 아래 2차 */
const PRIMARY_NAV_COUNT = 3;

const MOBILE_NAV = NAV;

const NAV_COLLAPSE_KEY = "looplus-nav-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const focused = path.startsWith("/routines/");
  const isActive = (href: string) =>
    path === href || path.startsWith(href + "/");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(NAV_COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(NAV_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-dvh w-full bg-white">
      <aside
        className={clsx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-ink-200 bg-white py-5 transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px] px-2" : "w-56 px-3 lg:w-60",
        )}
      >
        <div
          className={clsx(
            "mb-5 flex items-center",
            collapsed ? "justify-center" : "justify-between px-2",
          )}
        >
          <Link href="/home" className={collapsed ? "" : "min-w-0"}>
            {collapsed ? <LogoMark size={28} /> : <Logo />}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              aria-label="메뉴 접기"
              title="메뉴 접기"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <Icon name="panel-left" size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="메뉴 펼치기"
            title="메뉴 펼치기"
            className="mb-3 flex w-full items-center justify-center rounded-lg py-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        )}

        <nav aria-label="주 메뉴" className="flex flex-col gap-0.5">
          {NAV.map((n, i) => (
            <div key={n.href}>
              {i === PRIMARY_NAV_COUNT && (
                <div
                  className={clsx(
                    "my-2 border-t border-ink-100",
                    collapsed ? "mx-1" : "mx-2",
                  )}
                />
              )}
              <Link
                href={n.href}
                title={n.label}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={clsx(
                  "flex items-center rounded-lg text-[14px] transition-colors",
                  collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-2.5 px-3 py-2",
                  isActive(n.href)
                    ? "bg-gold-50 font-semibold text-gold-600"
                    : i < PRIMARY_NAV_COUNT
                      ? "font-medium text-ink-600 hover:bg-ink-100"
                      : "font-medium text-ink-400 hover:bg-ink-100 hover:text-ink-600",
                )}
              >
                <Icon name={n.icon} size={18} />
                {!collapsed && n.label}
              </Link>
            </div>
          ))}
        </nav>
        <Link
          href="/profile"
          className="mt-6 flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm text-ink-600 hover:bg-ink-100"
          title="프로필·도구"
        >
          <Icon name="users" size={20} />
          {!collapsed && "프로필·도구"}
        </Link>
        <div className="mt-auto space-y-2 border-t border-ink-100 pt-3">
          {!collapsed && (
            <>
              <div className="px-2">
                <SaveStatusChip />
              </div>
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
            </>
          )}
          <AccountMenu compact={collapsed} />
        </div>
      </aside>

      <main className="app-main min-w-0 flex-1 px-5 pt-5 md:px-6 lg:px-8 xl:px-10">
        {!focused && (
          <div className="mb-5 flex items-center justify-between gap-2 md:hidden">
            <SaveStatusChip />
            <Link
              href="/profile"
              className="habit-icon-button ml-auto"
              aria-label="프로필과 도구"
            >
              <Icon name="users" size={22} />
            </Link>
          </div>
        )}
        <div className="mx-auto w-full max-w-[1680px]">{children}</div>
      </main>

      {!focused && (
        <nav
          aria-label="하단 메뉴"
          className="app-tabs fixed inset-x-0 bottom-0 z-20 flex border-t border-ink-200 bg-white md:hidden"
        >
          {MOBILE_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={clsx(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[13px] active:bg-ink-100",
                isActive(n.href)
                  ? "font-semibold text-gold-600"
                  : "text-ink-500",
              )}
            >
              <Icon name={n.icon} size={20} />
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
