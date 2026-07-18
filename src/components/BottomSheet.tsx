"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** 모바일 바텀시트 (lg 이상에선 렌더하지 않음) */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200" />
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-ink-700">{title}</div>
          <button onClick={onClose} aria-label="닫기" className="text-ink-400">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
