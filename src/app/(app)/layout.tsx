import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { Providers } from "@/components/Providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrationGate>
      <Providers>
        <AppShell>{children}</AppShell>
      </Providers>
    </HydrationGate>
  );
}
