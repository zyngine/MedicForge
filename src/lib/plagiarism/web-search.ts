// Shared web-search-for-plagiarism. Used by /api/plagiarism/web-search
// (standalone) and /api/plagiarism/check (orchestrated pipeline).
//
// Provider order: Google Custom Search → Bing Web Search. Each search uses
// an exact-phrase query ("…") so we surface verbatim matches rather than
// loose topical results. Configure GOOGLE_SEARCH_API_KEY +
// GOOGLE_SEARCH_ENGINE_ID, or BING_SEARCH_API_KEY.

export interface WebSearchMatch {
  title: string;
  url: string;
  snippet: string;
  matchedQuery: string;
}

export interface WebSearchOutcome {
  configured: boolean;
  provider: string | null;
  results: WebSearchMatch[];
  queriesUsed: number;
  phrasesSearched: string[];
  error?: string;
}

function extractSearchPhrases(text: string, maxPhrases = 5): string[] {
  const cleanText = text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?'"()-]/g, "")
    .trim();
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200);
  if (sentences.length === 0) {
    const words = cleanText.split(/\s+/);
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 7; i += 15) {
      phrases.push(words.slice(i, i + 8).join(" "));
    }
    return phrases.slice(0, maxPhrases);
  }
  const selected: string[] = [];
  const step = Math.max(1, Math.floor(sentences.length / maxPhrases));
  for (let i = 0; i < sentences.length && selected.length < maxPhrases; i += step) {
    const words = sentences[i].split(/\s+/);
    const phrase = words.slice(0, Math.min(10, words.length)).join(" ");
    if (phrase.length >= 20) selected.push(phrase);
  }
  return selected;
}

async function searchGoogle(
  query: string,
  apiKey: string,
  engineId: string,
): Promise<WebSearchMatch[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", engineId);
  url.searchParams.set("q", `"${query}"`);
  url.searchParams.set("num", "3");
  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error("[plagiarism/web] Google error:", await res.text());
    return [];
  }
  const data = await res.json();
  return (data.items || []).map(
    (item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      matchedQuery: query,
    }),
  );
}

async function searchBing(query: string, apiKey: string): Promise<WebSearchMatch[]> {
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", `"${query}"`);
  url.searchParams.set("count", "3");
  url.searchParams.set("responseFilter", "Webpages");
  const res = await fetch(url.toString(), {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
  });
  if (!res.ok) {
    console.error("[plagiarism/web] Bing error:", await res.text());
    return [];
  }
  const data = await res.json();
  return (data.webPages?.value || []).map(
    (item: { name: string; url: string; snippet: string }) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      matchedQuery: query,
    }),
  );
}

export async function runWebSearch(content: string): Promise<WebSearchOutcome> {
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const bingKey = process.env.BING_SEARCH_API_KEY;

  if (!googleKey && !bingKey) {
    return {
      configured: false,
      provider: null,
      results: [],
      queriesUsed: 0,
      phrasesSearched: [],
    };
  }

  const phrases = extractSearchPhrases(content, 5);
  if (phrases.length === 0) {
    return {
      configured: true,
      provider: googleKey ? "google" : "bing",
      results: [],
      queriesUsed: 0,
      phrasesSearched: [],
    };
  }

  const provider = googleKey && googleEngineId ? "google" : "bing";
  const all: WebSearchMatch[] = [];
  const seen = new Set<string>();
  for (const phrase of phrases) {
    let found: WebSearchMatch[] = [];
    try {
      if (provider === "google") {
        found = await searchGoogle(phrase, googleKey!, googleEngineId!);
      } else if (bingKey) {
        found = await searchBing(phrase, bingKey);
      }
    } catch (err) {
      console.error("[plagiarism/web] phrase search failed:", err);
    }
    for (const r of found) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        all.push(r);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return {
    configured: true,
    provider,
    results: all,
    queriesUsed: phrases.length,
    phrasesSearched: phrases,
  };
}
