// Strip properly-quoted and cited passages from a body of text so they don't
// count against a student's similarity score. We treat as "cited":
//   - Block quotes wrapped in straight or curly double quotes that are
//     followed (within ~20 chars) by a citation marker like (Author, 2024)
//     or [12] or footnote markers
//   - Inline quotes immediately followed by an in-text citation
//   - Lines that begin with "> " (markdown block-quote)
//
// We intentionally do NOT strip every quoted span — only those that look
// genuinely cited. Otherwise students could just wrap copied content in
// quotes and dodge detection.

export interface CitationStripResult {
  stripped: string;
  removedWords: number;
  originalWords: number;
}

const CITATION_TAIL = /\s*(?:\((?:[A-Z][a-zA-Z'’\-]+(?:\s+(?:&|and|et\s+al\.?)\s+[A-Z][a-zA-Z'’\-]+)?(?:\s*,\s*\d{4}[a-z]?(?:\s*,\s*p+\.\s*\d+(?:[–\-]\d+)?)?)?|\d{4}|p+\.?\s*\d+(?:[–\-]\d+)?)\)|\[\s*\d+(?:\s*[,–\-]\s*\d+)*\s*\])/;

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function stripCitedQuotes(text: string): CitationStripResult {
  const originalWords = countWords(text);
  let out = text;

  // Markdown block-quote lines starting with "> " followed shortly by citation.
  out = out.replace(/^>\s*([^\n]+)(\([^)]+\)|\[\d+\])\s*$/gm, "");

  // Curly/straight double-quoted spans followed by citation.
  // Match opening quote, content (no newline, no nested quote), closing quote.
  const quotedWithCitation = new RegExp(
    String.raw`["“]([^"”\n]{15,500})["”]` + CITATION_TAIL.source,
    "g",
  );
  out = out.replace(quotedWithCitation, "");

  // Bare in-text citations on their own — leave those alone; they're tiny.

  out = out.replace(/\s+/g, " ").trim();
  const remainingWords = countWords(out);
  return {
    stripped: out,
    removedWords: Math.max(0, originalWords - remainingWords),
    originalWords,
  };
}
