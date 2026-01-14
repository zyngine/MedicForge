"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { WifiOff, RefreshCw, Home, CloudOff } from "lucide-react";
import { useOffline } from "@/lib/hooks/use-offline";

export default function OfflinePage() {
  const { status, forceSync } = useOffline();
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = "/";
    } else {
      window.location.reload();
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You&apos;re Back Online!</h1>
            <p className="text-muted-foreground mb-6">
              Your connection has been restored.
            </p>
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
          <p className="text-muted-foreground mb-6">
            It looks like you&apos;ve lost your internet connection. Some features
            may be unavailable until you&apos;re back online.
          </p>

          <div className="space-y-4">
            {status.pendingSync.total > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CloudOff className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    {status.pendingSync.total} items waiting to sync
                  </span>
                </div>
                <ul className="text-sm text-orange-700 space-y-1">
                  {status.pendingSync.submissions > 0 && (
                    <li>• {status.pendingSync.submissions} assignment submission(s)</li>
                  )}
                  {status.pendingSync.clinicalLogs > 0 && (
                    <li>• {status.pendingSync.clinicalLogs} clinical log(s)</li>
                  )}
                  {status.pendingSync.skillAttempts > 0 && (
                    <li>• {status.pendingSync.skillAttempts} skill attempt(s)</li>
                  )}
                  {status.pendingSync.patientContacts > 0 && (
                    <li>• {status.pendingSync.patientContacts} patient contact(s)</li>
                  )}
                </ul>
                <p className="text-xs text-orange-600 mt-2">
                  These will automatically sync when you&apos;re back online.
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <h3 className="font-medium mb-2">What you can still do:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View cached course content</li>
                <li>• Read downloaded materials</li>
                <li>• Draft assignments (will sync when online)</li>
                <li>• Log clinical hours offline</li>
                <li>• Practice skill sheets</li>
              </ul>
            </div>

            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            {status.pendingSync.total > 0 && isOnline && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudOff className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
