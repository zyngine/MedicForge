"use client";

import { useState } from "react";
import { WifiOff, CloudOff, X, RefreshCw, Download } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { useOffline, useInstallPrompt, useServiceWorker } from "@/lib/hooks/use-offline";

export function OfflineIndicator() {
  const { status, forceSync } = useOffline();
  const { canInstall, promptInstall } = useInstallPrompt();
  const { updateAvailable, update } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Show offline banner
  if (!status.isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-orange-500 text-white py-2 px-4 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You&apos;re offline. Some features may be limited.
            </span>
            {status.pendingSync.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {status.pendingSync.total} pending
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show pending sync indicator
  if (status.pendingSync.total > 0 && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <CloudOff className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Pending Sync</h3>
              <button
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {status.pendingSync.total} item(s) waiting to sync
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show update available
  if (updateAvailable && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <RefreshCw className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Update Available</h3>
              <button
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              A new version of MedicForge is available.
            </p>
            <Button size="sm" className="mt-2" onClick={update}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Update Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show install prompt
  if (canInstall && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Install App</h3>
              <button
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Install MedicForge for offline access and a better experience.
            </p>
            <Button size="sm" className="mt-2" onClick={promptInstall}>
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
