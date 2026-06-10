import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json(
        { error: "UNSPLASH_ACCESS_KEY not set in .env.local" },
        { status: 500 },
      );
    }

    // Extract meaningful keywords from the prompt (skip style descriptors)
    const stopWords = new Set([
      "photorealistic", "highly", "detailed", "professional", "photography",
      "digital", "art", "painterly", "artistic", "vibrant", "brushstrokes",
      "minimalist", "clean", "simple", "flat", "design", "colors", "high",
      "contrast", "colorful", "vivid", "style", "a", "an", "the", "of",
      "in", "on", "with", "and", "or", "for",
    ]);
    const query = prompt
      .trim()
      .split(/[\s,]+/)
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
      .slice(0, 5)
      .join(" ");

    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query || prompt.trim())}&orientation=landscape&content_filter=high`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json() as {
      urls: { regular: string; full: string };
      alt_description: string | null;
    };

    // Return the image URL directly — no proxying needed, Unsplash URLs are public
    return NextResponse.json({ url: data.urls.regular });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch image" },
      { status: 500 },
    );
  }
}