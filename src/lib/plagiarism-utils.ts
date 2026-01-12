/**
 * Plagiarism detection utilities
 * Basic implementation using text similarity algorithms
 */

export interface PlagiarismMatch {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  similarity: number;
  matchedSnippets: Array<{
    original: string;
    matched: string;
    position: number;
  }>;
}

export interface PlagiarismResult {
  overallSimilarity: number;
  matches: PlagiarismMatch[];
  wordCount: number;
  uniqueWordCount: number;
}

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate n-grams from text
 */
function generateNgrams(text: string, n: number): Set<string> {
  const words = normalizeText(text).split(" ");
  const ngrams = new Set<string>();

  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(" ");
    if (ngram.trim()) {
      ngrams.add(ngram);
    }
  }

  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return (intersection.size / union.size) * 100;
}

/**
 * Find matching snippets between two texts
 */
function findMatchingSnippets(
  text1: string,
  text2: string,
  minWords: number = 5
): Array<{ original: string; matched: string; position: number }> {
  const snippets: Array<{ original: string; matched: string; position: number }> = [];
  const words1 = text1.split(/\s+/);
  const normalized2 = normalizeText(text2);

  for (let i = 0; i < words1.length - minWords; i++) {
    for (let length = minWords; length <= Math.min(20, words1.length - i); length++) {
      const snippet = words1.slice(i, i + length).join(" ");
      const normalizedSnippet = normalizeText(snippet);

      if (normalized2.includes(normalizedSnippet)) {
        // Check if this extends a previous match
        const lastSnippet = snippets[snippets.length - 1];
        if (lastSnippet && lastSnippet.position + lastSnippet.original.split(" ").length >= i) {
          // Extend the previous match
          lastSnippet.original = words1.slice(
            lastSnippet.position,
            i + length
          ).join(" ");
          lastSnippet.matched = normalizedSnippet;
        } else if (length >= minWords + 3) {
          // Only add longer matches to avoid noise
          snippets.push({
            original: snippet,
            matched: normalizedSnippet,
            position: i,
          });
          // Skip ahead to avoid overlapping matches
          i = i + length - 1;
          break;
        }
      }
    }
  }

  return snippets;
}

/**
 * Compare a submission against a single source
 */
export function compareTexts(
  submission: string,
  source: { id: string; title: string; type: string; content: string }
): PlagiarismMatch | null {
  // Generate 5-grams for comparison (5 consecutive words)
  const submissionNgrams = generateNgrams(submission, 5);
  const sourceNgrams = generateNgrams(source.content, 5);

  const similarity = jaccardSimilarity(submissionNgrams, sourceNgrams);

  // Only report if similarity is above threshold
  if (similarity < 5) {
    return null;
  }

  const matchedSnippets = findMatchingSnippets(submission, source.content);

  return {
    sourceId: source.id,
    sourceTitle: source.title,
    sourceType: source.type,
    similarity: Math.round(similarity * 100) / 100,
    matchedSnippets,
  };
}

/**
 * Check submission against multiple sources
 */
export function checkPlagiarism(
  submission: string,
  sources: Array<{ id: string; title: string; type: string; content: string }>
): PlagiarismResult {
  const words = submission.split(/\s+/).filter((w) => w.length > 0);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

  const matches: PlagiarismMatch[] = [];

  for (const source of sources) {
    const match = compareTexts(submission, source);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  // Calculate overall similarity (highest match or weighted average)
  const overallSimilarity =
    matches.length > 0
      ? Math.min(100, matches.reduce((sum, m) => sum + m.similarity, 0) / Math.max(matches.length, 1))
      : 0;

  return {
    overallSimilarity: Math.round(overallSimilarity * 100) / 100,
    matches: matches.slice(0, 10), // Top 10 matches
    wordCount: words.length,
    uniqueWordCount: uniqueWords.size,
  };
}

/**
 * Get similarity rating based on percentage
 */
export function getSimilarityRating(score: number): {
  level: "low" | "medium" | "high" | "critical";
  label: string;
  color: string;
} {
  if (score < 10) {
    return { level: "low", label: "Original", color: "green" };
  }
  if (score < 25) {
    return { level: "medium", label: "Some Similarity", color: "yellow" };
  }
  if (score < 50) {
    return { level: "high", label: "Significant Similarity", color: "orange" };
  }
  return { level: "critical", label: "High Similarity", color: "red" };
}
