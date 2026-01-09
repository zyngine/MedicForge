"use client";

import { TenantProvider } from "@/lib/hooks/use-tenant";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}
