import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json() as { content: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!groqKey) {
      console.error("Groq API key not found in environment variables");
      return NextResponse.json(
        { error: "Groq API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to .env.local" },
        { status: 500 },
      );
    }

    console.log("Calling Groq API for rewrite with content length:", content.length);

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
            content: `Rewrite the following post content to make it clearer, more polished, and engaging while preserving the original meaning.

Return only the rewritten plain text. Do not use markdown, headings, bold text, or explanations.

Content:
${content}`,
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
    console.error("Rewrite AI error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
