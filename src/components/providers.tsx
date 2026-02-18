"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "@/lib/hooks/use-tenant";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toast";

// Create a client with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on every tab focus
      refetchOnReconnect: true, // Do refetch when network reconnects
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" enableSystem>
        <TenantProvider>
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
