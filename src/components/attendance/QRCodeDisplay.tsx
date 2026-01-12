"use client";

import { useState, useEffect } from "react";
import { QrCode, RefreshCw, Clock, CheckCircle, Users, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@/components/ui";
import { useAttendanceSessions, useSessionCheckins, AttendanceSession } from "@/lib/hooks/use-qr-attendance";

interface QRCodeDisplayProps {
  eventId: string;
  eventTitle: string;
}

export function QRCodeDisplay({ eventId, eventTitle }: QRCodeDisplayProps) {
  const {
    sessions,
    isLoading,
    createSession,
    endSession,
    getQRCode,
    isCreating,
    isEnding,
  } = useAttendanceSessions(eventId);

  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Find active session
  useEffect(() => {
    const active = sessions?.find(
      (s) => s.is_active && new Date(s.expires_at) > new Date()
    );
    setActiveSession(active || null);
  }, [sessions]);

  // Generate QR code when active session changes
  useEffect(() => {
    if (activeSession) {
      getQRCode(activeSession).then(setQrCodeUrl).catch(console.error);
    } else {
      setQrCodeUrl(null);
    }
  }, [activeSession, getQRCode]);

  // Update time remaining countdown
  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const expires = new Date(activeSession.expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleCreateSession = async (expiresInMinutes: number) => {
    try {
      await createSession({ eventId, expiresInMinutes });
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await endSession(activeSession.id);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Attendance
        </CardTitle>
        <CardDescription>{eventTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {activeSession ? (
          <div className="space-y-4">
            {/* Active QR Code */}
            <div className="flex flex-col items-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Attendance QR Code"
                  className="w-64 h-64 border rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}

              {/* Session Code */}
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Session Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {activeSession.session_code}
                </p>
              </div>

              {/* Time Remaining */}
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span
                  className={`font-mono ${
                    timeRemaining === "Expired" ? "text-destructive" : ""
                  }`}
                >
                  {timeRemaining || "Loading..."}
                </span>
              </div>
            </div>

            {/* Check-ins Count */}
            <SessionCheckinsList sessionId={activeSession.id} />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCreateSession(15)}
                disabled={isCreating}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate (15 min)
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndSession}
                disabled={isEnding}
                className="flex-1"
              >
                End Session
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8">
              <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No active attendance session. Start one to allow students to check in.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleCreateSession(15)}
                disabled={isCreating}
                variant="outline"
              >
                15 min
              </Button>
              <Button
                onClick={() => handleCreateSession(30)}
                disabled={isCreating}
              >
                30 min
              </Button>
              <Button
                onClick={() => handleCreateSession(60)}
                disabled={isCreating}
                variant="outline"
              >
                1 hour
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionCheckinsList({ sessionId }: { sessionId: string }) {
  const { data: checkins, isLoading } = useSessionCheckins(sessionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{checkins?.length || 0} checked in</span>
      </div>
      {checkins && checkins.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1">
          {checkins.map((checkin) => (
            <div
              key={checkin.id}
              className="flex items-center gap-2 text-sm"
            >
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{checkin.student?.full_name || "Unknown"}</span>
              <span className="text-muted-foreground text-xs">
                {new Date(checkin.checked_in_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
