"use client";

import { useEffect, useState } from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };

export function Toaster() {
  // Delay showing toasts until after hydration to prevent flash of errors
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for page to fully load before showing toasts
    const timer = setTimeout(() => setIsReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground",
          success: "group-[.toaster]:bg-success group-[.toaster]:text-success-foreground",
          warning: "group-[.toaster]:bg-warning group-[.toaster]:text-warning-foreground",
        },
      }}
    />
  );
}

// Convenience functions
export const showToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),
  info: (message: string, description?: string) =>
    toast.info(message, { description }),
  loading: (message: string) =>
    toast.loading(message),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => toast.promise(promise, messages),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
