"use client";

import { useEffect } from "react";
import { TenantProvider } from "@/lib/hooks/use-tenant";

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[App] Service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("[App] Service worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <ServiceWorkerRegistration />
      {children}
    </TenantProvider>
  );
}
