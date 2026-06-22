import { NextRequest, NextResponse } from "next/server";

const stopWords = new Set([
  "about", "above", "after", "again", "also", "although", "always", "among",
  "another", "because", "been", "before", "being", "between", "both", "could",
  "does", "doing", "each", "either", "every", "from", "give", "goes", "going",
  "good", "great", "have", "having", "here", "high", "into", "just", "know",
  "like", "made", "make", "many", "more", "most", "much", "need", "only",
  "other", "over", "people", "post", "really", "said", "same", "share",
  "should", "some", "still", "such", "take", "than", "that", "their", "them",
  "then", "there", "these", "they", "thing", "think", "this", "those",
  "through", "time", "very", "want", "were", "what", "when", "where",
  "which", "while", "with", "work", "would", "write", "writing", "your",
  "photorealistic", "highly", "detailed", "professional", "photography",
  "digital", "painterly", "artistic", "vibrant", "brushstrokes", "minimalist",
  "clean", "simple", "flat", "design", "colors", "contrast", "colorful",
  "vivid", "style", "image", "picture", "photo", "generate", "content",
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "has", "was", "our", "out", "use", "its", "how", "why", "who", "will",
  "new", "one", "two", "get", "got", "see", "way",
]);

function normalizeWord(word: string) {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9#]+|[^a-z0-9]+$/g, "")
    .replace(/'s$/, "")
    .replace(/s$/, "");
}

function isUsefulWord(word: string) {
  return word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word);
}

function buildUnsplashQuery(prompt: string) {
  const tokens = prompt
    .replace(/https?:\/\/\S+/g, " ")
    .match(/#?[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? [];

  const words = tokens.map(normalizeWord).filter(isUsefulWord);
  if (!words.length) return prompt.trim();

  const scores = new Map<string, number>();
  for (const word of words) {
    const lengthBonus = Math.min(word.length, 10) / 10;
    scores.set(word, (scores.get(word) ?? 0) + 1 + lengthBonus);
  }

  const phraseScores = new Map<string, number>();
  for (let index = 0; index < words.length - 1; index += 1) {
    const phraseWords = words.slice(index, index + 3);
    for (let size = 2; size <= phraseWords.length; size += 1) {
      const phrase = phraseWords.slice(0, size).join(" ");
      phraseScores.set(phrase, (phraseScores.get(phrase) ?? 0) + size);
    }
  }

  const topWords = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  const bestPhrase = Array.from(phraseScores.entries())
    .filter(([phrase]) => phrase.split(" ").some((word) => topWords.includes(word)))
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const queryParts = bestPhrase
    ? [...bestPhrase.split(" "), ...topWords]
    : topWords;

  return Array.from(new Set(queryParts)).slice(0, 5).join(" ");
}

export async function POST(req: NextRequest) {
  try {
    console.log("[generate-image] Request received");

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[generate-image] JSON parse error:", e);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { prompt } = body as { prompt?: string };

    if (!prompt?.trim()) {
      console.warn("[generate-image] Empty prompt");
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    console.log("[generate-image] Prompt:", prompt.slice(0, 50));

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.error("[generate-image] UNSPLASH_ACCESS_KEY is missing from environment");
      return NextResponse.json(
        { error: "UNSPLASH_ACCESS_KEY not configured. Please add it to Vercel environment variables." },
        { status: 500 },
      );
    }

    console.log("[generate-image] Using Unsplash API with key length:", accessKey.length);

    const query = buildUnsplashQuery(prompt);
    console.log("[generate-image] Built query:", query);

    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query || prompt.trim())}&orientation=landscape&content_filter=high`;
    console.log("[generate-image] Unsplash URL:", url.slice(0, 100) + "...");

    let res;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
      });
      console.log("[generate-image] Unsplash response status:", res.status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown fetch error";
      console.error("[generate-image] Fetch error:", msg);
      return NextResponse.json({ error: `Failed to reach Unsplash API: ${msg}` }, { status: 502 });
    }

    if (!res.ok) {
      let errText = "";
      try {
        errText = await res.text();
      } catch {
        errText = "(could not read error body)";
      }
      const errorMessage = `Unsplash API returned ${res.status}: ${errText}`;
      console.error("[generate-image]", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    let data;
    try {
      data = await res.json() as {
        urls?: { regular?: string; full?: string };
        alt_description?: string | null;
      };
      console.log("[generate-image] Parsed Unsplash response");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown JSON parse error";
      console.error("[generate-image] JSON parse error:", msg);
      return NextResponse.json({ error: `Failed to parse Unsplash response: ${msg}` }, { status: 502 });
    }

    if (!data?.urls?.regular) {
      console.error("[generate-image] Invalid response structure:", JSON.stringify(data).slice(0, 200));
      return NextResponse.json({ error: "Unsplash did not return a valid image URL" }, { status: 502 });
    }

    console.log("[generate-image] Success! Returning image URL");
    return NextResponse.json({ url: data.urls.regular });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-image] Uncaught exception:", msg, err);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
