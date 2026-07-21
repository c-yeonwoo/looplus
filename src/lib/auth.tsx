"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { identify } from "./analytics";
import { getSupabase, isSupabaseConfigured } from "./supabase";

interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  /** 이메일 + 비밀번호 로그인 */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * 이메일 + 비밀번호 회원가입.
   * 이메일 확인이 켜져 있으면 session 없이 끝나며 needsEmailConfirm=true.
   */
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  /** OTP 코드 발송 (이메일) — 보조 */
  sendCode: (email: string) => Promise<{ error?: string }>;
  /** OTP 코드 검증 → 로그인 */
  verifyCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) identify(u.id, { email_domain: u.email?.split("@")[1] });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: mapAuthError(error.message) } : {};
  };

  const signUp: AuthState["signUp"] = async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { error: mapAuthError(error.message) };
    // 확인 메일 대기(세션 없음) vs 즉시 로그인
    if (!data.session) return { needsEmailConfirm: true };
    return {};
  };

  const sendCode: AuthState["sendCode"] = async (email) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error ? { error: mapAuthError(error.message) } : {};
  };

  const verifyCode: AuthState["verifyCode"] = async (email, code) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
    return error ? { error: mapAuthError(error.message) } : {};
  };

  const signOut = async () => {
    const sb = getSupabase();
    await sb?.auth.signOut();
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{
        configured: isSupabaseConfigured,
        loading,
        user,
        signIn,
        signUp,
        sendCode,
        verifyCode,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Supabase 영문 메시지를 짧은 한국어로 */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("user already registered")) return "이미 가입된 이메일이에요. 로그인해주세요.";
  if (m.includes("password should be at least")) return "비밀번호는 6자 이상이어야 해요.";
  if (m.includes("email rate limit") || m.includes("over_email_send_rate_limit"))
    return "이메일 발송 한도를 잠시 초과했어요. 비밀번호로 로그인하거나 잠시 후 다시 시도해주세요.";
  if (m.includes("email address") && m.includes("invalid")) return "이메일 형식을 확인해주세요.";
  if (m.includes("signup is disabled")) return "현재 회원가입이 닫혀 있어요.";
  return message;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Provider 밖(또는 미설정)에서도 안전하게 로컬 모드 반환
    return {
      configured: false,
      loading: false,
      user: null,
      signIn: async () => ({ error: "미설정" }),
      signUp: async () => ({ error: "미설정" }),
      sendCode: async () => ({ error: "미설정" }),
      verifyCode: async () => ({ error: "미설정" }),
      signOut: async () => {},
    };
  }
  return ctx;
}
