import { db, DBPost } from '@/lib/db';
import { CreatePostInput, Post, AIWritingRequest, ImageGenerationRequest } from '@/types/post';
import { postSchema, aiWritingSchema, imageGenerationSchema } from '@/validators/postSchema';

export class PostService {
  static async getAllPosts(): Promise<Post[]> {
    const posts = db.getAllPosts();
    return posts.map(this.transformDBPostToPost);
  }

  static async getPostById(id: string): Promise<Post | null> {
    const post = db.getPostById(id);
    return post ? this.transformDBPostToPost(post) : null;
  }

  static async createPost(input: CreatePostInput, author: string = 'Anonymous'): Promise<Post> {
    const validated = postSchema.parse(input);
    
    const dbPost = db.createPost({
      title: validated.title,
      content: validated.content,
      imageUrl: validated.imageUrl,
      author,
      tags: validated.tags,
      isPublished: true,
    });

    return this.transformDBPostToPost(dbPost);
  }

  static async generateAIContent(request: AIWritingRequest): Promise<string> {
    const validated = aiWritingSchema.parse(request);
    
    
    const lengthMap = { short: 100, medium: 300, long: 500 };
    const targetLength = lengthMap[validated.length];
    
    
    const responses: Record<string, string[]> = {
      professional: [
        `In today's rapidly evolving landscape, ${validated.prompt} has become increasingly significant. Organizations must adapt their strategies to leverage emerging opportunities while mitigating potential risks. This comprehensive analysis explores key considerations and actionable insights.`,
        `The intersection of technology and innovation presents unique challenges for ${validated.prompt}. Industry leaders are recognizing the need for strategic alignment and sustainable practices.`,
      ],
      casual: [
        `Hey! So I was thinking about ${validated.prompt} and honestly, it's pretty interesting. Here's what I've learned and why I think it matters to all of us.`,
        `You know what's cool about ${validated.prompt}? Let me break it down for you in a way that actually makes sense.`,
      ],
      creative: [
        `Imagine a world where ${validated.prompt} transforms everything we know. The possibilities dance like fireflies in the twilight of innovation, each one holding a story waiting to unfold.`,
        `In the realm of ${validated.prompt}, creativity knows no bounds. Like an artist with an infinite canvas, we paint possibilities that challenge the very fabric of convention.`,
      ],
      formal: [
        `This document presents a formal examination of ${validated.prompt}. The following analysis is based on established methodologies and peer-reviewed research.`,
        `The subject of ${validated.prompt} warrants careful consideration. This treatise aims to provide a structured evaluation of pertinent factors.`,
      ],
    };

    const toneResponses = responses[validated.tone] || responses.professional;
    const response = toneResponses[Math.floor(Math.random() * toneResponses.length)];
    
    
    if (response.length < targetLength) {
      return response + ' ' + response;
    }
    return response.substring(0, targetLength);
  }

  static async generateImage(request: ImageGenerationRequest): Promise<string> {
    const validated = imageGenerationSchema.parse(request);
    
    
    const sizeMap = {
      small: '256x256',
      medium: '512x512',
      large: '1024x1024',
    };

   
    const styleColors: Record<string, string> = {
      realistic: '3a7bd5',
      artistic: 'd53a9d',
      minimal: '3ad5a7',
      vibrant: 'd5a73a',
    };

    const color = styleColors[validated.style] || '3a7bd5';
    const size = sizeMap[validated.size];
    
   
    return `https://via.placeholder.com/${size}/${color}/ffffff?text=${encodeURIComponent(validated.prompt.substring(0, 30))}`;
  }

  static async rewriteContent(content: string, tone: string): Promise<string> {
    
    const rewrites: Record<string, string> = {
      professional: content.replace(/\b(good|bad|nice)\b/g, (match) => {
        const map: Record<string, string> = { good: 'excellent', bad: 'suboptimal', nice: 'favorable' };
        return map[match] || match;
      }),
      casual: content.replace(/\b(utilize|implement|leverage)\b/g, (match) => {
        const map: Record<string, string> = { utilize: 'use', implement: 'put in place', leverage: 'use' };
        return map[match] || match;
      }),
      concise: content.split('.').slice(0, 2).join('.') + '.',
    };

    return rewrites[tone] || content;
  }

  private static transformDBPostToPost(dbPost: DBPost): Post {
    return {
      ...dbPost,
      createdAt: dbPost.createdAt,
    };
  }
}