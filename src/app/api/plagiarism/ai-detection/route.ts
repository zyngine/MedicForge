import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  aiScore: number; // 0-100, higher = more likely AI
  humanScore: number; // 0-100, higher = more likely human
  provider: string;
  details: {
    perplexity?: number;
    burstiness?: number;
    sentenceVariability?: number;
    vocabularyRichness?: number;
    repetitionScore?: number;
    naturalness?: number;
  };
  sentences?: Array<{
    text: string;
    aiProbability: number;
  }>;
  message?: string;
}

// Local AI detection using linguistic analysis
// This analyzes text patterns that distinguish AI from human writing
function analyzeTextLocally(text: string): AIDetectionResult {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length < 3) {
    return {
      isAIGenerated: false,
      confidence: 0,
      aiScore: 0,
      humanScore: 100,
      provider: "local",
      details: {},
      message: "Text too short for reliable analysis (need at least 3 sentences)",
    };
  }

  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);

  // 1. Vocabulary Richness (Type-Token Ratio)
  // AI tends to use more diverse vocabulary consistently
  const ttr = uniqueWords.size / words.length;
  const vocabularyRichness = Math.min(100, ttr * 150);

  // 2. Sentence Length Variability (Burstiness)
  // Humans write with more variable sentence lengths
  const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const lengthVariance =
    sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
    sentenceLengths.length;
  const burstiness = Math.sqrt(lengthVariance);
  const burstiScore = Math.min(100, burstiness * 5);

  // 3. Repetition Analysis
  // AI often repeats phrases and sentence structures
  const twoGrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const gram = `${words[i]} ${words[i + 1]}`;
    twoGrams.set(gram, (twoGrams.get(gram) || 0) + 1);
  }
  const repeatedGrams = Array.from(twoGrams.values()).filter((c) => c > 2).length;
  const repetitionScore = Math.min(100, (repeatedGrams / (words.length / 10)) * 100);

  // 4. Sentence Starter Diversity
  // AI often starts sentences with similar patterns
  const starters = sentences.map((s) => {
    const firstWords = s.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    return firstWords;
  });
  const uniqueStarters = new Set(starters).size;
  const starterDiversity = (uniqueStarters / sentences.length) * 100;

  // 5. Punctuation Patterns
  // AI tends to use punctuation more uniformly
  const punctuation = text.match(/[,;:'"()-]/g) || [];
  const punctuationRatio = punctuation.length / words.length;
  const punctuationScore = Math.abs(punctuationRatio - 0.15) * 200; // Optimal ~0.15

  // 6. Transition Word Analysis
  // AI overuses certain transition words
  const aiTransitions = [
    "furthermore", "moreover", "additionally", "consequently",
    "subsequently", "nevertheless", "nonetheless", "in conclusion",
    "it is important to note", "it should be noted", "in summary",
    "as a result", "in addition", "on the other hand",
  ];
  const transitionCount = aiTransitions.reduce((count, trans) => {
    const regex = new RegExp(trans, "gi");
    return count + (text.match(regex) || []).length;
  }, 0);
  const transitionScore = Math.min(100, transitionCount * 15);

  // 7. First-Person Usage
  // Humans tend to use more first-person when writing naturally
  const firstPerson = (text.match(/\b(I|me|my|mine|myself|we|us|our)\b/gi) || []).length;
  const firstPersonRatio = firstPerson / words.length;
  const personalScore = Math.min(100, firstPersonRatio * 500);

  // 8. Contraction Usage
  // Humans use more contractions in natural writing
  const contractions = (text.match(/\w+'\w+/g) || []).length;
  const contractionRatio = contractions / sentences.length;
  const contractionScore = Math.min(100, contractionRatio * 100);

  // Calculate AI Score (higher = more likely AI)
  // Weight factors based on research into AI detection
  const aiIndicators = {
    highVocabulary: vocabularyRichness > 70 ? 15 : 0,
    lowBurstiness: burstiScore < 30 ? 20 : 0,
    highRepetition: repetitionScore > 30 ? 15 : 0,
    lowStarterDiversity: starterDiversity < 50 ? 15 : 0,
    uniformPunctuation: punctuationScore > 50 ? 10 : 0,
    aiTransitions: transitionScore > 20 ? 15 : 0,
    lowPersonal: personalScore < 10 ? 5 : 0,
    lowContractions: contractionScore < 20 ? 5 : 0,
  };

  const aiScore = Object.values(aiIndicators).reduce((a, b) => a + b, 0);
  const humanScore = 100 - aiScore;

  // Analyze individual sentences
  const sentenceAnalysis = sentences.slice(0, 10).map((sentence) => {
    const sWords = sentence.toLowerCase().split(/\s+/);
    const hasTransition = aiTransitions.some((t) =>
      sentence.toLowerCase().includes(t)
    );
    const isUniform = Math.abs(sWords.length - avgLength) < 3;
    const hasPersonal = /\b(I|me|my|we|us|our)\b/i.test(sentence);

    let prob = 30; // Base probability
    if (hasTransition) prob += 25;
    if (isUniform) prob += 15;
    if (!hasPersonal) prob += 10;
    if (sWords.length > 20 && sWords.length < 30) prob += 10; // AI sweet spot

    return {
      text: sentence.substring(0, 100) + (sentence.length > 100 ? "..." : ""),
      aiProbability: Math.min(95, prob),
    };
  });

  return {
    isAIGenerated: aiScore >= 50,
    confidence: Math.min(85, Math.abs(aiScore - 50) + 35), // Max 85% for local
    aiScore,
    humanScore,
    provider: "local",
    details: {
      perplexity: 100 - vocabularyRichness, // Inverse of vocabulary richness
      burstiness: burstiScore,
      sentenceVariability: starterDiversity,
      vocabularyRichness,
      repetitionScore,
      naturalness: (personalScore + contractionScore) / 2,
    },
    sentences: sentenceAnalysis,
  };
}

// GPTZero API integration
async function checkWithGPTZero(text: string, apiKey: string): Promise<AIDetectionResult> {
  const response = await fetch("https://api.gptzero.me/v2/predict/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      document: text,
      multilingual: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GPTZero API error: ${error}`);
  }

  const data = await response.json();

  // GPTZero returns completely_generated_prob, mixed probability, etc.
  const aiProb = (data.documents?.[0]?.completely_generated_prob || 0) * 100;
  const mixedProb = (data.documents?.[0]?.mixed_probability || 0) * 100;
  const overallAiScore = Math.max(aiProb, mixedProb * 0.7);

  return {
    isAIGenerated: overallAiScore >= 50,
    confidence: Math.min(98, 70 + overallAiScore * 0.28),
    aiScore: overallAiScore,
    humanScore: 100 - overallAiScore,
    provider: "gptzero",
    details: {
      perplexity: data.documents?.[0]?.average_generated_prob
        ? (1 - data.documents[0].average_generated_prob) * 100
        : undefined,
    },
    sentences: data.documents?.[0]?.sentences?.map((s: { sentence: string; generated_prob: number }) => ({
      text: s.sentence.substring(0, 100),
      aiProbability: s.generated_prob * 100,
    })),
  };
}

// Originality.ai API integration
async function checkWithOriginality(text: string, apiKey: string): Promise<AIDetectionResult> {
  const response = await fetch("https://api.originality.ai/api/v1/scan/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OAI-API-KEY": apiKey,
    },
    body: JSON.stringify({
      content: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Originality.ai API error: ${error}`);
  }

  const data = await response.json();

  const aiScore = (data.score?.ai || 0) * 100;

  return {
    isAIGenerated: aiScore >= 50,
    confidence: Math.min(98, 75 + aiScore * 0.23),
    aiScore,
    humanScore: (data.score?.original || 0) * 100,
    provider: "originality",
    details: {},
  };
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

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 words for reliable AI detection" },
        { status: 400 }
      );
    }

    // Try external providers first, fall back to local analysis
    const gptzeroKey = process.env.GPTZERO_API_KEY;
    const originalityKey = process.env.ORIGINALITY_API_KEY;

    let result: AIDetectionResult;

    if (gptzeroKey) {
      try {
        result = await checkWithGPTZero(content, gptzeroKey);
        return NextResponse.json(result);
      } catch (err) {
        console.error("GPTZero failed, falling back:", err);
      }
    }

    if (originalityKey) {
      try {
        result = await checkWithOriginality(content, originalityKey);
        return NextResponse.json(result);
      } catch (err) {
        console.error("Originality.ai failed, falling back:", err);
      }
    }

    // Fall back to local analysis
    result = analyzeTextLocally(content);

    // Add note about local analysis
    if (!gptzeroKey && !originalityKey) {
      result.message =
        "Using local analysis. For higher accuracy, configure GPTZERO_API_KEY or ORIGINALITY_API_KEY.";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI detection failed" },
      { status: 500 }
    );
  }
}
