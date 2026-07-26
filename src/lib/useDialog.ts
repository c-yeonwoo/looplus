"use client";

import { useEffect, useRef } from "react";

/**
 * 모달 공통 동작 — 열릴 때 1회 포커스 이동 + Esc 닫기.
 *
 * onClose 를 ref 로 들고 있어야 한다. 호출부가 `onClose={() => setOpen(false)}` 처럼
 * 인라인 함수를 넘기면 부모가 리렌더될 때마다 identity 가 바뀌는데, 그걸 이펙트
 * 의존성에 두면 모달 안에서 입력할 때마다(스토어 갱신 → 부모 리렌더) 포커스가
 * 다시 초기 대상으로 끌려간다.
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const focusRef = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    focusRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return focusRef;
}
