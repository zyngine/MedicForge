import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const certId = searchParams.get("id");

    if (!certId) {
      return NextResponse.json({ error: "Missing certificate id" }, { status: 400 });
    }

    // Auth check — user must be logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load cert — use admin client so RLS doesn't block
    const admin = createCEAdminClient();
    const { data: cert, error } = await admin
      .from("ce_certificates")
      .select("*")
      .eq("id", certId)
      .single();

    if (error || !cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Ensure the requesting user owns this cert
    if (cert.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─── Load assets ───────────────────────────────────────────────────────
    const publicDir = path.join(process.cwd(), "public");
    const logoB64 = fs.readFileSync(path.join(publicDir, "logo-cert.png")).toString("base64");
    const sigB64 = fs.readFileSync(path.join(publicDir, "signature.jpg")).toString("base64");

    // ─── Generate PDF ────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();   // 792
    const H = doc.internal.pageSize.getHeight();  // 612

    const RED = "#B91C1C";
    const DARK_RED = "#7F1D1D";
    const DARK = "#111827";
    const GRAY = "#6B7280";
    const GOLD = "#B8860B";

    // ─── Outer background ───
    doc.setFillColor("#E5E7EB");
    doc.rect(0, 0, W, H, "F");

    // ─── Decorative outer border ───
    doc.setDrawColor(DARK_RED);
    doc.setLineWidth(3);
    doc.rect(12, 12, W - 24, H - 24);

    // ─── Inner gold border ───
    doc.setDrawColor(GOLD);
    doc.setLineWidth(1.5);
    doc.rect(18, 18, W - 36, H - 36);

    // ─── White certificate area ───
    doc.setFillColor("#FFFFFF");
    doc.rect(24, 24, W - 48, H - 48, "F");

    // ─── Thin inner border ───
    doc.setDrawColor(DARK_RED);
    doc.setLineWidth(0.75);
    doc.rect(32, 32, W - 64, H - 64);

    // ─── Corner ornaments ───
    const cornerLen = 30;
    const ci = 36;
    doc.setDrawColor(GOLD);
    doc.setLineWidth(1.5);
    doc.line(ci, ci, ci + cornerLen, ci); doc.line(ci, ci, ci, ci + cornerLen);
    doc.line(W - ci, ci, W - ci - cornerLen, ci); doc.line(W - ci, ci, W - ci, ci + cornerLen);
    doc.line(ci, H - ci, ci + cornerLen, H - ci); doc.line(ci, H - ci, ci, H - ci - cornerLen);
    doc.line(W - ci, H - ci, W - ci - cornerLen, H - ci); doc.line(W - ci, H - ci, W - ci, H - ci - cornerLen);

    // ─── Red accent bars ───
    doc.setFillColor(RED);
    doc.rect(40, 40, W - 80, 4, "F");
    doc.rect(40, H - 44, W - 80, 4, "F");

    // ─── Logo (centered) ───
    const logoW = 280;
    const logoH = 80;
    doc.addImage("data:image/png;base64," + logoB64, "PNG", W / 2 - logoW / 2, 52, logoW, logoH);

    // ─── Gold divider under logo ───
    doc.setDrawColor(GOLD);
    doc.setLineWidth(0.5);
    const divY = 140;
    doc.line(W / 2 - 160, divY, W / 2 - 20, divY);
    doc.line(W / 2 + 20, divY, W / 2 + 160, divY);
    doc.setFillColor(GOLD);
    doc.triangle(W / 2 - 5, divY, W / 2, divY - 4, W / 2 + 5, divY, "F");
    doc.triangle(W / 2 - 5, divY, W / 2, divY + 4, W / 2 + 5, divY, "F");

    // ─── Certificate of Completion ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(DARK);
    doc.text("Certificate of Completion", W / 2, 172, { align: "center" });

    // ─── This certifies that ───
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(GRAY);
    doc.text("This certifies that", W / 2, 198, { align: "center" });

    // ─── User name ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(DARK);
    doc.text(cert.user_name || "Unknown", W / 2, 228, { align: "center" });

    // Gold underline
    doc.setDrawColor(GOLD);
    doc.setLineWidth(0.75);
    const nameWidth = doc.getTextWidth(cert.user_name || "Unknown");
    doc.line(W / 2 - nameWidth / 2 - 10, 234, W / 2 + nameWidth / 2 + 10, 234);

    // ─── Body text ───
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(GRAY);
    doc.text("has successfully completed the continuing education course", W / 2, 256, { align: "center" });

    // ─── Course title ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(DARK);
    doc.text(cert.course_title || "Course", W / 2, 284, { align: "center", maxWidth: W - 160 });

    // ─── CEH hours ───
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(GRAY);
    const cehLine = `${cert.ceh_hours} Continuing Education Hour${cert.ceh_hours !== 1 ? "s" : ""}`;
    doc.text(cehLine, W / 2, 308, { align: "center" });

    // ─── NREMT ID if present ───
    if (cert.user_nremt_id) {
      doc.setFontSize(10);
      doc.text(`NREMT ID: ${cert.user_nremt_id}`, W / 2, 326, { align: "center" });
    }

    // ─── Divider ───
    doc.setDrawColor("#D1D5DB");
    doc.setLineWidth(0.5);
    doc.line(100, 344, W - 100, 344);

    // ─── Footer columns ───
    const col1 = 180;
    const col2 = W / 2;
    const col3 = W - 180;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text("COURSE NUMBER", col1, 362, { align: "center" });
    doc.text("COMPLETION DATE", col2, 362, { align: "center" });
    doc.text("CERTIFICATE NUMBER", col3, 362, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK);
    doc.text(cert.course_number || "—", col1, 378, { align: "center" });
    doc.text(
      cert.completion_date
        ? new Date(cert.completion_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—",
      col2, 378, { align: "center" }
    );
    doc.text(cert.certificate_number || "—", col3, 378, { align: "center" });

    // ─── Expiry note ───
    if (cert.expires_at) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(GRAY);
      doc.text(
        `Expires: ${new Date(cert.expires_at + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        W / 2, 392, { align: "center" }
      );
    }

    // ─── Signature Section ───
    const sigY = 462;

    // Handwritten signature image
    const sigImgW = 180;
    const sigImgH = 65;
    doc.addImage("data:image/jpeg;base64," + sigB64, "JPEG", W / 2 - sigImgW / 2, sigY - 62, sigImgW, sigImgH);

    // Signature line
    doc.setDrawColor(DARK);
    doc.setLineWidth(0.75);
    doc.line(W / 2 - 120, sigY, W / 2 + 120, sigY);

    // Name and credentials
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(DARK);
    doc.text("Trent Summers, NRP", W / 2, sigY + 16, { align: "center" });

    // Title
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GRAY);
    doc.text("Owner / Program Director", W / 2, sigY + 30, { align: "center" });
    doc.text("MedicForge Continuing Education", W / 2, sigY + 42, { align: "center" });

    // ─── Verification footer ───
    if (cert.verification_code) {
      doc.setFontSize(7);
      doc.setTextColor("#9CA3AF");
      doc.text(
        `Verify at medicforge.net/verify  |  Verification Code: ${cert.verification_code}`,
        W / 2, H - 52, { align: "center" }
      );
    }

    // ─── Return PDF ──────────────────────────────────────────────────────────
    const pdfBytes = doc.output("arraybuffer");
    const filename = `MedicForge-CE-${cert.certificate_number || certId}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[CE Certificate PDF]", err);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}
