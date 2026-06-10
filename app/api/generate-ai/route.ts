import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, tone, length } = await req.json() as {
      prompt: string;
      tone: "professional" | "casual" | "creative" | "formal";
      length: "short" | "medium" | "long";
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!groqKey) {
      console.error("Groq API key not found in environment variables");
      return NextResponse.json(
        { error: "Groq API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to .env.local" },
        { status: 500 },
      );
    }

    console.log("Calling Groq API with prompt:", prompt.substring(0, 50));

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Write a natural, human-sounding social post about: "${prompt.trim()}".

Tone: ${tone}

Selected length: ${length}

Word count requirements:
- short: 100-150 words
- medium: 250-350 words
- long: 500-700 words

IMPORTANT:
- You MUST satisfy the requested word count.
- If length is long, write at least 500 words.
- Write about the actual topic literally.
- Do not write about how to write the post.
- Do not mention prompts, word counts, instructions, or AI.
- Do not use generic coaching language.
- If the topic is a place like "I love Paris", write about Paris itself: atmosphere, streets, food, landmarks, memories, culture, and why someone loves it.
- If the topic is a personal opinion like "I hate biryani", write from that perspective with concrete reasons and examples.
- Do not pretend the topic has a community, learning resources, productivity benefits, or success path unless the prompt clearly asks for that.
- Do not repeat paragraphs or use generic filler.
- Do not use markdown.
- Do not use headings.
- Do not use bold text.
- Return plain text only.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    console.log("Groq API response status:", res.status);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("Groq API error response:", error);
      return NextResponse.json(
        { error: error.error?.message || error.message || "Groq API error" },
        { status: res.status },
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text?.trim()) {
      console.error("No content in Groq response");
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 },
      );
    }

    console.log("Groq API success, returned", text.length, "characters");
    return NextResponse.json({ content: text.trim() });
  } catch (error) {
    console.error("Generate AI error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
