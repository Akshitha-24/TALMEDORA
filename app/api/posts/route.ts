import { NextRequest, NextResponse } from 'next/server';

const posts: Array<{
  id: string;
  title: string;
  content: string;
  author?: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
}> = [];

export async function GET() {
  return NextResponse.json([...posts].reverse());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, author, imageUrl, tags } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const post = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      author: author?.trim() || undefined,
      imageUrl: imageUrl?.trim() || undefined,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
    };

    posts.push(post);
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}