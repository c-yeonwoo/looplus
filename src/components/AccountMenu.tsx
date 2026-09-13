"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import { Button } from "./ui";
import { AuthForm } from "./AuthForm";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, loading, signOut, isGuest } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div
        className={
          compact
            ? "flex w-full justify-center py-2 text-[11px] text-ink-300"
            : "px-3 py-2 text-[11px] text-ink-300"
        }
      >
        …
      </div>
    );
  }

  if (user) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={signOut}
          title={user.email ?? "로그아웃"}
          className="flex w-full items-center justify-center rounded-lg py-2 text-ink-500 hover:bg-ink-100"
        >
          <Icon name="users" size={16} />
        </button>
      );
    }
    return (
      <div className="px-3 py-2">
        <div className="truncate text-xs font-medium text-ink-700">{user.email}</div>
        <div className="mt-0.5 text-[10px] text-sage-600">클라우드 동기화 중</div>
        <button
          type="button"
          onClick={signOut}
          className="mt-1 text-[11px] font-semibold text-ink-400 hover:text-ink-600"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={isGuest ? "계정 만들고 백업" : "로그인"}
        className={
          compact
            ? "flex w-full items-center justify-center rounded-lg py-2 text-brand-700 hover:bg-brand-50"
            : "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
        }
      >
        <Icon name="users" size={16} />
        {!compact && (isGuest ? "계정 만들고 백업" : "로그인")}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-lg font-extrabold text-ink-800">
              {isGuest ? "내 루프를 백업할까요?" : "이메일 로그인"}
            </div>
            {isGuest && (
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                로그인하거나 가입하면 이 기기에 만든 루프와 실행 기록을 계정에 저장합니다.
              </p>
            )}
            <div className="mt-4">
              <AuthForm onSuccess={() => setOpen(false)} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Link
                href="/login"
                className="text-xs font-semibold text-gold-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                전체 화면으로
              </Link>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
