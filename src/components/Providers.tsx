"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SyncManager } from "./SyncManager";
import { SpendDiagnosisSync } from "./SpendDiagnosisSync";
import { SaveStatusWatcher } from "./SaveStatus";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SyncManager />
      <SaveStatusWatcher />
      <SpendDiagnosisSync />
      {children}
    </AuthProvider>
  );
}
