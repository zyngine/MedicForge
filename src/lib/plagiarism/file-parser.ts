// Fetch a file from its URL (signed Supabase Storage URL or any public URL)
// and extract plain text. Supports PDF, .docx, .doc (best-effort), .txt.
// Used by the plagiarism pipeline to also check uploaded files, not just
// typed text content.

export interface ParsedFile {
  url: string;
  fileName: string;
  text: string;
  wordCount: number;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB safety cap

async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return String(data.text || "");
}

async function parseDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || "");
}

function pickFileName(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").pop() || url;
    return decodeURIComponent(tail.split("?")[0]);
  } catch {
    return url.split("?")[0].split("/").pop() || "file";
  }
}

export async function parseDocumentFromUrl(url: string): Promise<ParsedFile | null> {
  const fileName = pickFileName(url);
  const lower = fileName.toLowerCase();

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[plagiarism/file] fetch failed:", res.status, url);
    return null;
  }
  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_BYTES) {
    console.warn("[plagiarism/file] skipping oversized file:", fileName, contentLength);
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    console.warn("[plagiarism/file] skipping oversized buffer:", fileName, arrayBuffer.byteLength);
    return null;
  }
  const buffer = Buffer.from(arrayBuffer);

  let text = "";
  try {
    if (lower.endsWith(".pdf")) {
      text = await parsePDF(buffer);
    } else if (lower.endsWith(".docx")) {
      text = await parseDocx(buffer);
    } else if (lower.endsWith(".doc")) {
      try {
        text = await parseDocx(buffer);
      } catch {
        return null;
      }
    } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else {
      return null;
    }
  } catch (err) {
    console.error("[plagiarism/file] parse failed:", fileName, err);
    return null;
  }

  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text || text.length < 10) return null;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { url, fileName, text, wordCount };
}

export async function parseDocumentsFromUrls(urls: string[]): Promise<ParsedFile[]> {
  const results = await Promise.all(urls.map((u) => parseDocumentFromUrl(u).catch(() => null)));
  return results.filter((r): r is ParsedFile => !!r);
}
