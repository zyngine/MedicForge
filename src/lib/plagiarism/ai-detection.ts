// Shared AI-generated content detection. Used by /api/plagiarism/ai-detection
// (standalone endpoint for instructor-on-demand checks) and by the main
// /api/plagiarism/check pipeline.
//
// Provider fallback order: GPTZero → Originality.ai → local linguistic
// analysis. The local heuristic alone is reasonably accurate but capped at
// ~85% confidence; configure GPTZERO_API_KEY or ORIGINALITY_API_KEY in the
// environment for higher-confidence detection.

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  aiScore: number;
  humanScore: number;
  provider: string;
  details: {
    perplexity?: number;
    burstiness?: number;
    sentenceVariability?: number;
    vocabularyRichness?: number;
    repetitionScore?: number;
    naturalness?: number;
  };
  sentences?: Array<{ text: string; aiProbability: number }>;
  message?: string;
}

export function analyzeTextLocally(text: string): AIDetectionResult {
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

  const ttr = uniqueWords.size / words.length;
  const vocabularyRichness = Math.min(100, ttr * 150);

  const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const lengthVariance =
    sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
    sentenceLengths.length;
  const burstiness = Math.sqrt(lengthVariance);
  const burstiScore = Math.min(100, burstiness * 5);

  const twoGrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const gram = `${words[i]} ${words[i + 1]}`;
    twoGrams.set(gram, (twoGrams.get(gram) || 0) + 1);
  }
  const repeatedGrams = Array.from(twoGrams.values()).filter((c) => c > 2).length;
  const repetitionScore = Math.min(100, (repeatedGrams / (words.length / 10)) * 100);

  const starters = sentences.map((s) =>
    s.split(/\s+/).slice(0, 2).join(" ").toLowerCase(),
  );
  const uniqueStarters = new Set(starters).size;
  const starterDiversity = (uniqueStarters / sentences.length) * 100;

  const punctuation = text.match(/[,;:'"()-]/g) || [];
  const punctuationRatio = punctuation.length / words.length;
  const punctuationScore = Math.abs(punctuationRatio - 0.15) * 200;

  const aiTransitions = [
    "furthermore",
    "moreover",
    "additionally",
    "consequently",
    "subsequently",
    "nevertheless",
    "nonetheless",
    "in conclusion",
    "it is important to note",
    "it should be noted",
    "in summary",
    "as a result",
    "in addition",
    "on the other hand",
  ];
  const transitionCount = aiTransitions.reduce((count, trans) => {
    const regex = new RegExp(trans, "gi");
    return count + (text.match(regex) || []).length;
  }, 0);
  const transitionScore = Math.min(100, transitionCount * 15);

  const firstPerson = (text.match(/\b(I|me|my|mine|myself|we|us|our)\b/gi) || []).length;
  const firstPersonRatio = firstPerson / words.length;
  const personalScore = Math.min(100, firstPersonRatio * 500);

  const contractions = (text.match(/\w+'\w+/g) || []).length;
  const contractionRatio = contractions / sentences.length;
  const contractionScore = Math.min(100, contractionRatio * 100);

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

  const sentenceAnalysis = sentences.slice(0, 10).map((sentence) => {
    const sWords = sentence.toLowerCase().split(/\s+/);
    const hasTransition = aiTransitions.some((t) => sentence.toLowerCase().includes(t));
    const isUniform = Math.abs(sWords.length - avgLength) < 3;
    const hasPersonal = /\b(I|me|my|we|us|our)\b/i.test(sentence);

    let prob = 30;
    if (hasTransition) prob += 25;
    if (isUniform) prob += 15;
    if (!hasPersonal) prob += 10;
    if (sWords.length > 20 && sWords.length < 30) prob += 10;

    return {
      text: sentence.substring(0, 100) + (sentence.length > 100 ? "..." : ""),
      aiProbability: Math.min(95, prob),
    };
  });

  return {
    isAIGenerated: aiScore >= 50,
    confidence: Math.min(85, Math.abs(aiScore - 50) + 35),
    aiScore,
    humanScore,
    provider: "local",
    details: {
      perplexity: 100 - vocabularyRichness,
      burstiness: burstiScore,
      sentenceVariability: starterDiversity,
      vocabularyRichness,
      repetitionScore,
      naturalness: (personalScore + contractionScore) / 2,
    },
    sentences: sentenceAnalysis,
  };
}

async function checkWithGPTZero(text: string, apiKey: string): Promise<AIDetectionResult> {
  const response = await fetch("https://api.gptzero.me/v2/predict/text", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ document: text, multilingual: false }),
  });
  if (!response.ok) throw new Error(`GPTZero API error: ${await response.text()}`);
  const data = await response.json();
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
    sentences: data.documents?.[0]?.sentences?.map(
      (s: { sentence: string; generated_prob: number }) => ({
        text: s.sentence.substring(0, 100),
        aiProbability: s.generated_prob * 100,
      }),
    ),
  };
}

async function checkWithOriginality(text: string, apiKey: string): Promise<AIDetectionResult> {
  const response = await fetch("https://api.originality.ai/api/v1/scan/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-OAI-API-KEY": apiKey },
    body: JSON.stringify({ content: text }),
  });
  if (!response.ok) throw new Error(`Originality.ai API error: ${await response.text()}`);
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

/** Tries providers in priority order, falls back to local heuristic. */
export async function runAIDetection(content: string): Promise<AIDetectionResult> {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return {
      ...analyzeTextLocally(content),
      message: "Text under 50 words — using rough local heuristic only.",
    };
  }
  const gptzero = process.env.GPTZERO_API_KEY;
  if (gptzero) {
    try {
      return await checkWithGPTZero(content, gptzero);
    } catch (err) {
      console.error("[plagiarism/ai] GPTZero failed, falling back:", err);
    }
  }
  const originality = process.env.ORIGINALITY_API_KEY;
  if (originality) {
    try {
      return await checkWithOriginality(content, originality);
    } catch (err) {
      console.error("[plagiarism/ai] Originality failed, falling back:", err);
    }
  }
  return analyzeTextLocally(content);
}
