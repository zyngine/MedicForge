"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, X, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { ScormPackage, ScormAttempt, useCurrentScormAttempt, useSaveScormData } from "@/lib/hooks/use-scorm";
import { useUser } from "@/lib/hooks/use-user";
import { initializeCMI, formatScormTime } from "@/lib/scorm-utils";
import { createClient } from "@/lib/supabase/client";

interface ScormPlayerProps {
  package: ScormPackage;
  onClose?: () => void;
  onComplete?: (attempt: ScormAttempt) => void;
}

export function ScormPlayer({ package: pkg, onClose, onComplete }: ScormPlayerProps) {
  const { user, profile } = useUser();
  const { data: attempt, isLoading: attemptLoading } = useCurrentScormAttempt(pkg.id);
  const { mutate: saveData } = useSaveScormData();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cmiDataRef = useRef<Record<string, string>>({});
  const startTimeRef = useRef<number>(Date.now());
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize CMI data
  useEffect(() => {
    if (!attempt || !user) return;

    const previousData = attempt.cmi_data || undefined;
    cmiDataRef.current = initializeCMI(
      pkg.version,
      user.id,
      profile?.full_name || user.email || "Student",
      previousData
    );
    startTimeRef.current = Date.now();
  }, [attempt, user, profile, pkg.version]);

  // Load SCORM content URL
  useEffect(() => {
    async function loadContent() {
      if (!pkg.storage_path || !pkg.entry_point) {
        setError("Package has no entry point");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Get signed URL for the package directory
        const basePath = pkg.storage_path.replace(/\.zip$/i, "");
        const contentPath = `${basePath}/${pkg.entry_point}`;

        const { data, error: urlError } = await supabase.storage
          .from("scorm-packages")
          .createSignedUrl(contentPath, 3600); // 1 hour

        if (urlError) throw urlError;
        if (!data?.signedUrl) throw new Error("Failed to get content URL");

        setContentUrl(data.signedUrl);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading SCORM content:", err);
        setError("Failed to load SCORM content");
        setIsLoading(false);
      }
    }

    if (pkg.status === "ready") {
      loadContent();
    } else if (pkg.status === "error") {
      setError(pkg.error_message || "Package failed to process");
      setIsLoading(false);
    } else {
      setError("Package is not ready");
      setIsLoading(false);
    }
  }, [pkg]);

  // Save data periodically
  useEffect(() => {
    if (!attempt) return;

    saveIntervalRef.current = setInterval(() => {
      saveCurrentData();
    }, 30000); // Save every 30 seconds

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [attempt]);

  const saveCurrentData = useCallback(() => {
    if (!attempt) return;

    // Add session time
    const sessionSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const sessionTimeKey = pkg.version === "scorm_2004"
      ? "cmi.session_time"
      : "cmi.core.session_time";
    cmiDataRef.current[sessionTimeKey] = formatScormTime(sessionSeconds, pkg.version);

    saveData(
      { attemptId: attempt.id, cmiData: cmiDataRef.current },
      {
        onSuccess: (updatedAttempt) => {
          if (
            updatedAttempt.lesson_status &&
            ["completed", "passed", "failed"].includes(updatedAttempt.lesson_status)
          ) {
            onComplete?.(updatedAttempt);
          }
        },
      }
    );
  }, [attempt, pkg.version, saveData, onComplete]);

  // SCORM API implementation
  useEffect(() => {
    // SCORM 1.2 API
    const API = {
      LMSInitialize: () => {
        return "true";
      },
      LMSFinish: () => {
        saveCurrentData();
        return "true";
      },
      LMSGetValue: (element: string) => {
        return cmiDataRef.current[element] || "";
      },
      LMSSetValue: (element: string, value: string) => {
        cmiDataRef.current[element] = value;
        return "true";
      },
      LMSCommit: () => {
        saveCurrentData();
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "No error",
      LMSGetDiagnostic: () => "",
    };

    // SCORM 2004 API
    const API_1484_11 = {
      Initialize: () => "true",
      Terminate: () => {
        saveCurrentData();
        return "true";
      },
      GetValue: (element: string) => {
        return cmiDataRef.current[element] || "";
      },
      SetValue: (element: string, value: string) => {
        cmiDataRef.current[element] = value;
        return "true";
      },
      Commit: () => {
        saveCurrentData();
        return "true";
      },
      GetLastError: () => "0",
      GetErrorString: () => "No error",
      GetDiagnostic: () => "",
    };

    // Expose APIs on window
    (window as any).API = API;
    (window as any).API_1484_11 = API_1484_11;

    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [saveCurrentData]);

  const handleClose = () => {
    saveCurrentData();
    onClose?.();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (attemptLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading SCORM content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
        {onClose && (
          <Button variant="outline" className="mt-4" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <h3 className="text-sm font-medium truncate">{pkg.title}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {contentUrl && (
          <iframe
            ref={iframeRef}
            src={contentUrl}
            className="absolute inset-0 w-full h-full border-0"
            title={pkg.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>
    </div>
  );
}
