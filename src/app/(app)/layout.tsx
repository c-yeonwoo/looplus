import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrationGate>
      <AppShell>{children}</AppShell>
    </HydrationGate>
  );
}
