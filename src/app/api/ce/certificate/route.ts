import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

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

    // ─── Generate PDF ────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();   // 792
    const H = doc.internal.pageSize.getHeight();  // 612

    const RED = "#B91C1C";
    const DARK = "#111827";
    const GRAY = "#6B7280";
    const LIGHT_GRAY = "#F3F4F6";

    // Background
    doc.setFillColor(LIGHT_GRAY);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor("#FFFFFF");
    doc.roundedRect(24, 24, W - 48, H - 48, 8, 8, "F");

    // Red top bar
    doc.setFillColor(RED);
    doc.rect(24, 24, W - 48, 6, "F");

    // Red bottom bar
    doc.rect(24, H - 30, W - 48, 6, "F");

    // MedicForge CE header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(RED);
    doc.text("MEDICFORGE CONTINUING EDUCATION", W / 2, 72, { align: "center" });

    // Decorative line
    doc.setDrawColor(RED);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 140, 80, W / 2 + 140, 80);

    // "Certificate of Completion"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(DARK);
    doc.text("Certificate of Completion", W / 2, 130, { align: "center" });

    // "This certifies that"
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(GRAY);
    doc.text("This certifies that", W / 2, 170, { align: "center" });

    // User name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(DARK);
    doc.text(cert.user_name || "Unknown", W / 2, 208, { align: "center" });

    // Name underline
    doc.setDrawColor(DARK);
    doc.setLineWidth(0.5);
    const nameWidth = doc.getTextWidth(cert.user_name || "Unknown");
    doc.line(W / 2 - nameWidth / 2, 214, W / 2 + nameWidth / 2, 214);

    // Body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(GRAY);
    doc.text("has successfully completed the continuing education course", W / 2, 240, { align: "center" });

    // Course title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(DARK);
    doc.text(cert.course_title || "Course", W / 2, 270, { align: "center", maxWidth: W - 160 });

    // CEH hours + CAPCE
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(GRAY);
    const cehLine = `${cert.ceh_hours} Continuing Education Hour${cert.ceh_hours !== 1 ? "s" : ""}${cert.is_capce_accredited ? "  •  CAPCE Accredited" : ""}`;
    doc.text(cehLine, W / 2, 298, { align: "center" });

    // NREMT ID if present
    if (cert.user_nremt_id) {
      doc.setFontSize(10);
      doc.text(`NREMT ID: ${cert.user_nremt_id}`, W / 2, 318, { align: "center" });
    }

    // Divider
    doc.setDrawColor("#E5E7EB");
    doc.setLineWidth(0.5);
    doc.line(80, 336, W - 80, 336);

    // Footer columns: course number | completion date | expires
    const col1 = 180;
    const col2 = W / 2;
    const col3 = W - 180;
    const rowLabel = 358;
    const rowValue = 374;

    doc.setFontSize(8);
    doc.setTextColor(GRAY);
    doc.text("COURSE NUMBER", col1, rowLabel, { align: "center" });
    doc.text("COMPLETION DATE", col2, rowLabel, { align: "center" });
    doc.text("CERTIFICATE NUMBER", col3, rowLabel, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK);
    doc.text(cert.course_number || "—", col1, rowValue, { align: "center" });
    doc.text(
      cert.completion_date
        ? new Date(cert.completion_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—",
      col2, rowValue, { align: "center" }
    );
    doc.text(cert.certificate_number || "—", col3, rowValue, { align: "center" });

    // Expiry note
    if (cert.expires_at) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(GRAY);
      doc.text(
        `Expires: ${new Date(cert.expires_at + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        W / 2, 392, { align: "center" }
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
