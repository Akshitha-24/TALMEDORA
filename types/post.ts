export interface Post {
  id: string;
  title: string;
  content: string;
  author?: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  author?: string;
  imageUrl?: string;
  tags: string[];
}

export interface AIWritingRequest {
  prompt: string;
  tone: 'professional' | 'casual' | 'creative' | 'formal';
  length: 'short' | 'medium' | 'long';
}

export interface ImageGenerationRequest {
  prompt: string;
  style: 'realistic' | 'artistic' | 'minimal' | 'vibrant';
  size: 'small' | 'medium' | 'large';
}