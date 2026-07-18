"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SyncManager } from "./SyncManager";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SyncManager />
      {children}
    </AuthProvider>
  );
}
