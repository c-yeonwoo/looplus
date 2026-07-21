"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button, TextInput } from "./ui";

type Mode = "login" | "signup" | "otp";

/** 이메일 로그인 폼 (모달·/login 공용) — 기본: 비밀번호, 보조: OTP */
export function AuthForm({
  onSuccess,
  compact = false,
}: {
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const { configured, signIn, signUp, sendCode, verifyCode } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <p className="text-sm text-ink-600">
          Supabase 환경변수가 없어 로그인을 쓸 수 없어요.
        </p>
        <div className="space-y-3 text-xs leading-relaxed text-ink-500">
          <div>
            <p className="mb-1 font-semibold text-ink-600">로컬 개발</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                <code className="rounded bg-ink-100 px-1">.env.local</code>에{" "}
                <code className="rounded bg-ink-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> ·{" "}
                <code className="rounded bg-ink-100 px-1">
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                </code>{" "}
                설정
              </li>
              <li>앱 재시작 후 이메일·비밀번호로 로그인</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const clearFeedback = () => {
    setErr(null);
    setInfo(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpStep("email");
    setCode("");
    setPassword("");
    clearFeedback();
  };

  const submitPassword = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!email.includes("@")) return setErr("이메일을 확인해주세요.");
    if (password.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    setBusy(true);
    clearFeedback();
    if (mode === "signup") {
      const { error, needsEmailConfirm } = await signUp(email.trim(), password);
      setBusy(false);
      if (error) setErr(error);
      else if (needsEmailConfirm) {
        setInfo("가입 확인 메일을 보냈어요. 메일함에서 확인한 뒤 로그인해주세요.");
        setMode("login");
      } else onSuccess?.();
    } else {
      const { error } = await signIn(email.trim(), password);
      setBusy(false);
      if (error) setErr(error);
      else onSuccess?.();
    }
  };

  const submitOtpEmail = async () => {
    if (!email.includes("@")) return setErr("이메일을 확인해주세요.");
    setBusy(true);
    clearFeedback();
    const { error } = await sendCode(email.trim());
    setBusy(false);
    if (error) setErr(error);
    else setOtpStep("code");
  };

  const submitOtpCode = async () => {
    setBusy(true);
    clearFeedback();
    const { error } = await verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (error) setErr(error);
    else onSuccess?.();
  };

  const onPasswordKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") void submitPassword();
  };

  return (
    <div className="space-y-3">
      {mode !== "otp" && (
        <div className="flex rounded-lg border border-ink-200 bg-ink-50 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={
              mode === "login"
                ? "flex-1 rounded-md bg-white px-3 py-1.5 text-ink-800 shadow-sm"
                : "flex-1 px-3 py-1.5 text-ink-500"
            }
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={
              mode === "signup"
                ? "flex-1 rounded-md bg-white px-3 py-1.5 text-ink-800 shadow-sm"
                : "flex-1 px-3 py-1.5 text-ink-500"
            }
          >
            회원가입
          </button>
        </div>
      )}

      <p className="text-sm text-ink-500">
        {mode === "otp"
          ? otpStep === "email"
            ? "이메일로 인증 코드를 보내드려요."
            : `${email} 로 보낸 6자리 코드를 입력하세요.`
          : mode === "signup"
            ? "이메일과 비밀번호로 계정을 만들어요. 기기 간 동기화에 사용됩니다."
            : "이메일과 비밀번호로 로그인하세요. 기기 간 동기화·백업에 사용됩니다."}
      </p>

      {mode === "otp" ? (
        <>
          {otpStep === "email" ? (
            <TextInput
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          ) : (
            <TextInput
              value={code}
              onChange={setCode}
              placeholder="6자리 코드"
              autoComplete="one-time-code"
            />
          )}
        </>
      ) : (
        <form className="space-y-2" onSubmit={submitPassword}>
          <TextInput
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            onKeyDown={onPasswordKey}
          />
          <TextInput
            value={password}
            onChange={setPassword}
            placeholder="비밀번호 (6자 이상)"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            onKeyDown={onPasswordKey}
          />
        </form>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      {info && <p className="text-xs text-sage-700">{info}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {mode === "otp" ? (
          <button
            type="button"
            className="text-xs font-semibold text-ink-400 hover:text-ink-600"
            onClick={() => switchMode("login")}
          >
            비밀번호로 로그인
          </button>
        ) : (
          <button
            type="button"
            className="text-xs font-semibold text-ink-400 hover:text-ink-600"
            onClick={() => switchMode("otp")}
          >
            코드로 로그인
          </button>
        )}

        <div className="flex gap-2">
          {mode === "otp" && otpStep === "code" && (
            <Button
              variant="ghost"
              onClick={() => {
                setOtpStep("email");
                setCode("");
                clearFeedback();
              }}
            >
              이메일 변경
            </Button>
          )}
          {mode === "otp" ? (
            otpStep === "email" ? (
              <Button onClick={submitOtpEmail} disabled={busy}>
                {busy ? "전송 중…" : "코드 받기"}
              </Button>
            ) : (
              <Button onClick={submitOtpCode} disabled={busy || code.trim().length < 6}>
                {busy ? "확인 중…" : "로그인"}
              </Button>
            )
          ) : (
            <Button onClick={() => void submitPassword()} disabled={busy}>
              {busy ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
