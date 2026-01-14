"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Card } from "@/components/ui";
import { QrCode, Camera, Check, X, RefreshCw, Copy, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";
import QRCode from "qrcode";

// QR Code Generator for Instructors
interface QRCodeGeneratorProps {
  sessionId: string;
  sessionTitle: string;
  expiresInMinutes?: number;
  onGenerate?: (code: string) => void;
}

export function QRCodeGenerator({
  sessionId,
  sessionTitle,
  expiresInMinutes = 15,
  onGenerate,
}: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [checkInCode, setCheckInCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate a new check-in code
  const generateCode = useCallback(async () => {
    if (!profile?.tenant_id || !sessionId) return;

    setIsGenerating(true);
    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Store the code in the database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("attendance_check_in_codes")
        .upsert({
          session_id: sessionId,
          tenant_id: profile.tenant_id,
          code,
          expires_at: expires.toISOString(),
          created_by: profile.id,
        }, { onConflict: "session_id" });

      if (error) throw error;

      // Generate QR code
      const checkInUrl = `${window.location.origin}/check-in/${code}`;
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setQrCodeUrl(qrDataUrl);
      setCheckInCode(code);
      setExpiresAt(expires);
      setTimeRemaining(expiresInMinutes * 60);
      onGenerate?.(code);
      toast.success("QR code generated");
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  }, [profile?.tenant_id, profile?.id, sessionId, expiresInMinutes, supabase, onGenerate]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setQrCodeUrl(null);
          setCheckInCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyCode = () => {
    if (checkInCode) {
      navigator.clipboard.writeText(checkInCode);
      toast.success("Code copied to clipboard");
    }
  };

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.download = `check-in-${sessionTitle.replace(/\s+/g, "-")}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Attendance Check-In</h3>
        <p className="text-sm text-muted-foreground mb-4">{sessionTitle}</p>

        {qrCodeUrl ? (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg inline-block">
              <img src={qrCodeUrl} alt="Check-in QR Code" className="mx-auto" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-mono font-bold tracking-wider">
                {checkInCode}
              </span>
              <Button variant="ghost" size="sm" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className={`text-sm ${timeRemaining < 60 ? "text-red-500" : "text-muted-foreground"}`}>
              Expires in {formatTime(timeRemaining)}
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadQR}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={generateCode}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-[300px] h-[300px] bg-muted rounded-lg flex items-center justify-center mx-auto">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
            <Button onClick={generateCode} disabled={isGenerating}>
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-2" />
              )}
              Generate QR Code
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// QR Code Scanner for Students
interface QRCodeScannerProps {
  onScan: (code: string) => void;
  onCancel?: () => void;
}

export function QRCodeScanner({ onScan, onCancel }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsScanning(false);
  }, [stream]);

  // Scan for QR codes
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const scan = async () => {
      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      try {
        // Use BarcodeDetector API if available
        if ("BarcodeDetector" in window) {
          // @ts-ignore - BarcodeDetector is not in TypeScript types yet
          const barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await barcodeDetector.detect(canvas);

          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            // Extract code from URL or use raw value
            const match = code.match(/\/check-in\/([A-Z0-9]+)$/i);
            const checkInCode = match ? match[1] : code;
            stopCamera();
            onScan(checkInCode.toUpperCase());
            return;
          }
        }
      } catch (err) {
        // BarcodeDetector not supported, continue scanning
      }

      animationRef.current = requestAnimationFrame(scan);
    };

    animationRef.current = requestAnimationFrame(scan);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, onScan, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-4 max-w-lg mx-auto">
      <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50" />
        </div>

        {/* Scanning indicator */}
        {isScanning && (
          <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
            Point camera at QR code
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center mb-4">{error}</div>
      )}

      <div className="flex justify-center gap-3">
        {onCancel && (
          <Button variant="outline" onClick={() => { stopCamera(); onCancel(); }}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

// Manual Code Entry
interface ManualCodeEntryProps {
  onSubmit: (code: string) => void;
  isLoading?: boolean;
}

export function ManualCodeEntry({ onSubmit, isLoading }: ManualCodeEntryProps) {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 6) {
      onSubmit(code.toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Enter Check-In Code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="XXXXXX"
          maxLength={6}
          className="w-full text-center text-2xl font-mono tracking-widest p-4 border rounded-lg"
          autoComplete="off"
        />
      </div>
      <Button type="submit" className="w-full" disabled={code.length < 6 || isLoading}>
        {isLoading ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Check In
      </Button>
    </form>
  );
}

// Combined Check-In Component for Students
interface StudentCheckInProps {
  onCheckIn: (sessionId: string) => Promise<boolean>;
}

export function StudentCheckIn({ onCheckIn }: StudentCheckInProps) {
  const [mode, setMode] = useState<"select" | "scan" | "manual">("select");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  const handleCodeSubmit = async (code: string) => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return;
    }

    setIsLoading(true);
    try {
      // Look up the code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: codeData, error: codeError } = await (supabase as any)
        .from("attendance_check_in_codes")
        .select("session_id, expires_at")
        .eq("code", code)
        .eq("tenant_id", profile.tenant_id)
        .single();

      if (codeError || !codeData) {
        toast.error("Invalid check-in code");
        return;
      }

      // Check if expired
      if (new Date(codeData.expires_at) < new Date()) {
        toast.error("This check-in code has expired");
        return;
      }

      // Record attendance
      const result = await onCheckIn(codeData.session_id);
      if (result) {
        setSuccess(true);
        toast.success("Successfully checked in!");
      }
    } catch (err) {
      console.error("Check-in failed:", err);
      toast.error("Check-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Checked In!</h2>
        <p className="text-muted-foreground">Your attendance has been recorded.</p>
      </Card>
    );
  }

  if (mode === "scan") {
    return (
      <QRCodeScanner
        onScan={handleCodeSubmit}
        onCancel={() => setMode("select")}
      />
    );
  }

  if (mode === "manual") {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <ManualCodeEntry onSubmit={handleCodeSubmit} isLoading={isLoading} />
        <Button
          variant="link"
          className="w-full mt-4"
          onClick={() => setMode("select")}
        >
          Back
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-center mb-6">
        Attendance Check-In
      </h2>
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-16 text-lg"
          onClick={() => setMode("scan")}
        >
          <Camera className="h-6 w-6 mr-3" />
          Scan QR Code
        </Button>
        <Button
          variant="outline"
          className="w-full h-16 text-lg"
          onClick={() => setMode("manual")}
        >
          <QrCode className="h-6 w-6 mr-3" />
          Enter Code
        </Button>
      </div>
    </Card>
  );
}
