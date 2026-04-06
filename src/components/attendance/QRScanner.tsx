"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useRef } from "react";
import { Camera, CheckCircle, Loader2, MapPin, Keyboard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Alert,
} from "@/components/ui";
import { useQRCheckin } from "@/lib/hooks/use-qr-attendance";
import { parseAttendanceQR } from "@/lib/qrcode-utils";

type ScanMode = "camera" | "code";
type CheckinStatus = "idle" | "scanning" | "processing" | "success" | "error";

export function QRScanner() {
  const [mode, setMode] = useState<ScanMode>("code");
  const [status, setStatus] = useState<CheckinStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { checkin, isChecking } = useQRCheckin();
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location not available:", error.message);
        }
      );
    }
  }, []);

  // Initialize camera scanner
  useEffect(() => {
    if (mode !== "camera") return;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (scannerRef.current && !html5QrCodeRef.current) {
          const scanner = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            handleQRScan,
            () => {} // Ignore errors during scanning
          );

          setStatus("scanning");
        }
      } catch (error) {
        console.error("Failed to start scanner:", error);
        setStatus("error");
        setErrorMessage("Unable to access camera. Please use manual code entry.");
        setMode("code");
      }
    };

    initScanner();

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
        html5QrCodeRef.current = null;
      }
    };
  }, [mode]);

  const handleQRScan = async (decodedText: string) => {
    // Parse the QR code
    const payload = parseAttendanceQR(decodedText);

    if (!payload) {
      setStatus("error");
      setErrorMessage("Invalid QR code or code has expired");
      return;
    }

    await processCheckin(payload.code);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    await processCheckin(manualCode.trim().toUpperCase());
  };

  const processCheckin = async (sessionCode: string) => {
    setStatus("processing");
    setErrorMessage(null);

    try {
      await checkin({
        sessionCode,
        location: userLocation || undefined,
      });

      setStatus("success");

      // Stop scanner if it was running
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Check-in failed"
      );
    }
  };

  const resetScanner = () => {
    setStatus("idle");
    setErrorMessage(null);
    setManualCode("");
  };

  if (status === "success") {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Successfully Checked In!
            </h3>
            <p className="text-muted-foreground mb-6">
              Your attendance has been recorded.
            </p>
            <Button onClick={resetScanner} variant="outline">
              Check In Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Check In
        </CardTitle>
        <CardDescription>
          Scan the QR code or enter the session code to check in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            onClick={() => setMode("camera")}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button
            variant={mode === "code" ? "default" : "outline"}
            onClick={() => setMode("code")}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Enter Code
          </Button>
        </div>

        {/* Error Alert */}
        {status === "error" && errorMessage && (
          <Alert variant="error">
            {errorMessage}
          </Alert>
        )}

        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {userLocation ? (
            <span className="text-green-600">Location available</span>
          ) : (
            <span>Location not available (some check-ins may require it)</span>
          )}
        </div>

        {/* Camera Scanner */}
        {mode === "camera" && (
          <div className="space-y-4">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-muted"
            />
            {status === "scanning" && (
              <p className="text-center text-sm text-muted-foreground">
                Point your camera at the QR code
              </p>
            )}
            {status === "processing" && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing check-in...</span>
              </div>
            )}
          </div>
        )}

        {/* Manual Code Entry */}
        {mode === "code" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                disabled={isChecking}
              />
              <p className="text-xs text-center text-muted-foreground">
                Ask your instructor for the attendance code
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={manualCode.length !== 6 || isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking in...
                </>
              ) : (
                "Check In"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
