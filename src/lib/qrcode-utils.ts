/**
 * QR Code utilities for attendance tracking
 */

import QRCode from "qrcode";

export interface AttendanceQRPayload {
  type: "attendance";
  eventId: string;
  tenantId: string;
  code: string; // Unique session code
  timestamp: number;
  expiresAt: number;
}

/**
 * Generate a QR code data URL for an attendance session
 */
export async function generateAttendanceQR(
  eventId: string,
  tenantId: string,
  sessionCode: string,
  expiresInMinutes = 15
): Promise<string> {
  const now = Date.now();
  const payload: AttendanceQRPayload = {
    type: "attendance",
    eventId,
    tenantId,
    code: sessionCode,
    timestamp: now,
    expiresAt: now + expiresInMinutes * 60 * 1000,
  };

  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return qrDataUrl;
}

/**
 * Generate a simple QR code for any text/URL
 */
export async function generateQRCode(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: options?.margin ?? 2,
    width: options?.width ?? 300,
    color: {
      dark: options?.color?.dark ?? "#000000",
      light: options?.color?.light ?? "#ffffff",
    },
  });
}

/**
 * Parse and validate an attendance QR code payload
 */
export function parseAttendanceQR(data: string): AttendanceQRPayload | null {
  try {
    const payload = JSON.parse(data);

    // Validate payload structure
    if (
      payload.type !== "attendance" ||
      !payload.eventId ||
      !payload.tenantId ||
      !payload.code ||
      !payload.timestamp ||
      !payload.expiresAt
    ) {
      return null;
    }

    // Check if expired
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload as AttendanceQRPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a unique session code for attendance
 */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
