"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import { Button, TextInput } from "./ui";

export function AccountMenu() {
  const { configured, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!configured) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-ink-400">
        <Icon name="lock" size={13} /> 로컬 모드 · 이 기기에 저장
      </div>
    );
  }

  if (user) {
    return (
      <div className="px-3 py-2">
        <div className="truncate text-xs text-ink-500">{user.email}</div>
        <button
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
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <Icon name="users" size={16} /> 로그인 · 저장
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submitEmail = async () => {
    if (!email.includes("@")) return setErr("이메일을 확인해주세요.");
    setBusy(true);
    setErr(null);
    const { error } = await sendCode(email.trim());
    setBusy(false);
    if (error) setErr(error);
    else setStep("code");
  };

  const submitCode = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (error) setErr(error);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-lg font-extrabold text-ink-800">
          {step === "email" ? "로그인 · 계정에 저장" : "인증 코드 입력"}
        </div>
        <p className="mb-4 text-sm text-ink-500">
          {step === "email"
            ? "이메일로 인증 코드를 보내드려요. 기기 간 동기화·백업에 사용됩니다."
            : `${email} 로 보낸 코드를 입력하세요.`}
        </p>

        {step === "email" ? (
          <TextInput value={email} onChange={setEmail} placeholder="you@example.com" />
        ) : (
          <TextInput value={code} onChange={setCode} placeholder="6자리 코드" />
        )}

        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          {step === "email" ? (
            <Button onClick={submitEmail} disabled={busy}>
              {busy ? "전송 중…" : "코드 받기"}
            </Button>
          ) : (
            <Button onClick={submitCode} disabled={busy || !code}>
              {busy ? "확인 중…" : "로그인"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
