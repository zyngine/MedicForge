import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Parse PDF - using dynamic require for CommonJS compatibility
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}

// Parse Word document using mammoth
async function parseDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";
    let title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension for title

    // Parse based on file type
    if (fileName.endsWith(".pdf")) {
      text = await parsePDF(buffer);
    } else if (fileName.endsWith(".docx")) {
      text = await parseDocx(buffer);
    } else if (fileName.endsWith(".doc")) {
      // .doc files (old Word format) - mammoth doesn't support them well
      // Try mammoth anyway, it sometimes works
      try {
        text = await parseDocx(buffer);
      } catch {
        return NextResponse.json(
          { error: "Old .doc format not fully supported. Please convert to .docx" },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, Word (.docx), or text files." },
        { status: 400 }
      );
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: "Could not extract text from file. The file may be empty or image-based." },
        { status: 400 }
      );
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      title,
      content: text,
      wordCount,
    });
  } catch (error) {
    console.error("Document parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse document" },
      { status: 500 }
    );
  }
}
