"use client";

import * as React from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Hook for PWA install prompt
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    // Check if already installed
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      // Check for iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    }

    return false;
  }, [installPrompt]);

  return {
    canInstall: !isInstalled && (!!installPrompt || isIOS),
    isInstalled,
    isIOS,
    promptInstall,
  };
}

// Install banner component
interface InstallBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export function InstallBanner({ className, onDismiss }: InstallBannerProps) {
  const { canInstall, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if previously dismissed
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setDismissed(true);
    onDismiss?.();
  };

  const handleInstall = async () => {
    if (isIOS) {
      // Show iOS install instructions
      alert(
        'To install MedicForge:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"'
      );
    } else {
      await promptInstall();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 flex items-center justify-between z-50 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-foreground/10 rounded-lg">
          <Smartphone className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">Install MedicForge</p>
          <p className="text-sm opacity-90">
            {isIOS
              ? "Add to your home screen for the best experience"
              : "Install the app for offline access and quick launch"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleInstall}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Download className="h-4 w-4 mr-2" />
          {isIOS ? "How to Install" : "Install"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// Compact install button for navigation
export function InstallButton({ className }: { className?: string }) {
  const { canInstall, isIOS, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  const handleClick = async () => {
    if (isIOS) {
      alert(
        'To install MedicForge:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"'
      );
    } else {
      await promptInstall();
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} className={className}>
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
}

// Update notification component
export function UpdateNotification({ className }: { className?: string }) {
  const [showUpdate, setShowUpdate] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        }
      });
    });
  }, []);

  if (!showUpdate) return null;

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    }
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border rounded-lg shadow-lg p-4 z-50",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Update Available</p>
          <p className="text-sm text-muted-foreground">
            A new version of MedicForge is available.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => setShowUpdate(false)}>
          Later
        </Button>
        <Button size="sm" onClick={handleUpdate}>
          Update Now
        </Button>
      </div>
    </div>
  );
}

// Offline indicator
export function OfflineIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-950 text-center py-2 text-sm font-medium z-50",
        className
      )}
    >
      You are offline. Some features may be limited.
    </div>
  );
}
