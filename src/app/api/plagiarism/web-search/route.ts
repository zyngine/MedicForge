import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  matchedQuery: string;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  queriesUsed: number;
  provider: string;
}

// Extract meaningful phrases from text for searching
function extractSearchPhrases(text: string, maxPhrases: number = 5): string[] {
  // Clean and normalize text
  const cleanText = text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?'"()-]/g, "")
    .trim();

  // Split into sentences
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200); // Keep medium-length sentences

  if (sentences.length === 0) {
    // Fall back to chunks if no good sentences
    const words = cleanText.split(/\s+/);
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 7; i += 15) {
      phrases.push(words.slice(i, i + 8).join(" "));
    }
    return phrases.slice(0, maxPhrases);
  }

  // Select diverse sentences (spread across the document)
  const selectedPhrases: string[] = [];
  const step = Math.max(1, Math.floor(sentences.length / maxPhrases));

  for (let i = 0; i < sentences.length && selectedPhrases.length < maxPhrases; i += step) {
    // Take a portion of the sentence (first 8-12 words)
    const words = sentences[i].split(/\s+/);
    const phrase = words.slice(0, Math.min(10, words.length)).join(" ");
    if (phrase.length >= 20) {
      selectedPhrases.push(phrase);
    }
  }

  return selectedPhrases;
}

// Search using Google Custom Search API
async function searchGoogle(
  query: string,
  apiKey: string,
  searchEngineId: string
): Promise<WebSearchResult[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", `"${query}"`); // Exact phrase search
  url.searchParams.set("num", "3");

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    console.error("Google Search error:", error);
    return [];
  }

  const data = await response.json();

  return (data.items || []).map((item: { title: string; link: string; snippet: string }) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    matchedQuery: query,
  }));
}

// Search using Bing Web Search API
async function searchBing(
  query: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", `"${query}"`); // Exact phrase search
  url.searchParams.set("count", "3");
  url.searchParams.set("responseFilter", "Webpages");

  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Bing Search error:", error);
    return [];
  }

  const data = await response.json();

  return (data.webPages?.value || []).map((item: { name: string; url: string; snippet: string }) => ({
    title: item.name,
    url: item.url,
    snippet: item.snippet,
    matchedQuery: query,
  }));
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tenant and check if they're instructor/admin
    const { data: profile } = await supabase
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "instructor"].includes(profile.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.length < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 characters" },
        { status: 400 }
      );
    }

    // Check for API keys - try Google first, then Bing
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const bingApiKey = process.env.BING_SEARCH_API_KEY;

    if (!googleApiKey && !bingApiKey) {
      return NextResponse.json(
        {
          error: "Web search not configured",
          message: "Please configure GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID or BING_SEARCH_API_KEY in environment variables"
        },
        { status: 501 }
      );
    }

    // Extract phrases to search
    const phrases = extractSearchPhrases(content, 5);

    if (phrases.length === 0) {
      return NextResponse.json({
        results: [],
        queriesUsed: 0,
        provider: "none",
        message: "Could not extract searchable phrases from content",
      });
    }

    const allResults: WebSearchResult[] = [];
    const seenUrls = new Set<string>();
    let provider = "";

    // Perform searches
    for (const phrase of phrases) {
      let results: WebSearchResult[] = [];

      if (googleApiKey && googleSearchEngineId) {
        provider = "google";
        results = await searchGoogle(phrase, googleApiKey, googleSearchEngineId);
      } else if (bingApiKey) {
        provider = "bing";
        results = await searchBing(phrase, bingApiKey);
      }

      // Deduplicate by URL
      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      results: allResults,
      queriesUsed: phrases.length,
      provider,
      phrasesSearched: phrases,
    } as WebSearchResponse & { phrasesSearched: string[] });
  } catch (error) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Web search failed" },
      { status: 500 }
    );
  }
}
