"use client";

import { jsPDF } from "jspdf";

export interface CertificateData {
  recipientName: string;
  courseName: string;
  courseType: string;
  completionDate: Date;
  instructorName: string;
  tenantName: string;
  tenantLogo?: string;
  certificateId: string;
  totalHours?: number;
  grade?: string;
  credentials?: string[];
}

export interface CertificateOptions {
  orientation?: "portrait" | "landscape";
  size?: "letter" | "a4";
  theme?: "classic" | "modern" | "minimal";
  primaryColor?: string;
  showBorder?: boolean;
  showSeal?: boolean;
}

const DEFAULT_OPTIONS: CertificateOptions = {
  orientation: "landscape",
  size: "letter",
  theme: "classic",
  primaryColor: "#2563eb",
  showBorder: true,
  showSeal: true,
};

export async function generateCertificate(
  data: CertificateData,
  options: CertificateOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create PDF with specified orientation and size
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: "in",
    format: opts.size,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Border
  if (opts.showBorder) {
    doc.setDrawColor(opts.primaryColor || "#2563eb");
    doc.setLineWidth(0.05);
    doc.rect(0.3, 0.3, pageWidth - 0.6, pageHeight - 0.6);
    doc.rect(0.4, 0.4, pageWidth - 0.8, pageHeight - 0.8);
  }

  // Decorative corners
  if (opts.theme === "classic") {
    drawDecorativeCorners(doc, pageWidth, pageHeight, opts.primaryColor || "#2563eb");
  }

  // Header - Certificate of Completion
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("CERTIFICATE OF COMPLETION", centerX, 1.2, { align: "center" });

  // Main title
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  doc.setTextColor(0, 0, 0);
  doc.text("Certificate", centerX, 1.8, { align: "center" });

  // Subtitle
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("This is to certify that", centerX, 2.3, { align: "center" });

  // Recipient name
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(opts.primaryColor || "#2563eb");
  doc.text(data.recipientName, centerX, 2.9, { align: "center" });

  // Decorative line under name
  doc.setDrawColor(opts.primaryColor || "#2563eb");
  doc.setLineWidth(0.02);
  doc.line(centerX - 2.5, 3.05, centerX + 2.5, 3.05);

  // Has successfully completed
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("has successfully completed", centerX, 3.4, { align: "center" });

  // Course name
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text(data.courseName, centerX, 3.9, { align: "center" });

  // Course type and details
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);

  const detailsLines: string[] = [data.courseType];
  if (data.totalHours) {
    detailsLines.push(`${data.totalHours} Hours`);
  }
  if (data.grade) {
    detailsLines.push(`Grade: ${data.grade}`);
  }
  doc.text(detailsLines.join(" | "), centerX, 4.3, { align: "center" });

  // Date
  const formattedDate = data.completionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Issued on ${formattedDate}`, centerX, 4.7, { align: "center" });

  // Signature section
  const sigY = 5.5;

  // Instructor signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  doc.line(1.5, sigY, 4, sigY);
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(data.instructorName, 2.75, sigY + 0.25, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Instructor", 2.75, sigY + 0.45, { align: "center" });

  // Organization signature line
  doc.line(pageWidth - 4, sigY, pageWidth - 1.5, sigY);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(data.tenantName, pageWidth - 2.75, sigY + 0.25, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Training Organization", pageWidth - 2.75, sigY + 0.45, { align: "center" });

  // Certificate seal
  if (opts.showSeal) {
    drawSeal(doc, centerX, sigY, opts.primaryColor || "#2563eb");
  }

  // Certificate ID at bottom
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Certificate ID: ${data.certificateId}`, centerX, pageHeight - 0.5, { align: "center" });

  // Credentials if any
  if (data.credentials && data.credentials.length > 0) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Certifications Earned: ${data.credentials.join(", ")}`,
      centerX,
      pageHeight - 0.7,
      { align: "center" }
    );
  }

  return doc.output("blob");
}

function drawDecorativeCorners(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  color: string
): void {
  doc.setDrawColor(color);
  doc.setLineWidth(0.02);

  const cornerSize = 0.5;
  const offset = 0.5;

  // Top-left corner
  doc.line(offset, offset + cornerSize, offset, offset);
  doc.line(offset, offset, offset + cornerSize, offset);

  // Top-right corner
  doc.line(pageWidth - offset - cornerSize, offset, pageWidth - offset, offset);
  doc.line(pageWidth - offset, offset, pageWidth - offset, offset + cornerSize);

  // Bottom-left corner
  doc.line(offset, pageHeight - offset - cornerSize, offset, pageHeight - offset);
  doc.line(offset, pageHeight - offset, offset + cornerSize, pageHeight - offset);

  // Bottom-right corner
  doc.line(pageWidth - offset - cornerSize, pageHeight - offset, pageWidth - offset, pageHeight - offset);
  doc.line(pageWidth - offset, pageHeight - offset - cornerSize, pageWidth - offset, pageHeight - offset);
}

function drawSeal(doc: jsPDF, x: number, y: number, color: string): void {
  // Draw a simple circular seal
  doc.setDrawColor(color);
  doc.setLineWidth(0.03);
  doc.circle(x, y, 0.5, "S");
  doc.circle(x, y, 0.4, "S");

  // Star in the middle
  doc.setFillColor(color);
  const starPoints = 5;
  const outerRadius = 0.2;
  const innerRadius = 0.1;
  const angleOffset = -Math.PI / 2;

  for (let i = 0; i < starPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = angleOffset + (i * Math.PI) / starPoints;
    const _px = x + radius * Math.cos(angle);
    const _py = y + radius * Math.sin(angle);

    if (i === 0) {
      // Move to first point
    }
  }

  // Simplified - just draw text
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(color);
  doc.text("★", x, y + 0.03, { align: "center" });
}

// Generate verification QR code URL
export function getVerificationUrl(certificateId: string): string {
  return `https://www.medicforge.net/verify/${certificateId}`;
}

// Download certificate as PDF
export async function downloadCertificate(
  data: CertificateData,
  options?: CertificateOptions
): Promise<void> {
  const blob = await generateCertificate(data, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificate-${data.certificateId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
