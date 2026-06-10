import { z } from 'zod';

export const postSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10000 characters'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
});

export const aiWritingSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000),
  tone: z.enum(['professional', 'casual', 'creative', 'formal']),
  length: z.enum(['short', 'medium', 'long']),
});

export const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(500),
  style: z.enum(['realistic', 'artistic', 'minimal', 'vibrant']),
  size: z.enum(['small', 'medium', 'large']),
});

export type PostSchema = z.infer<typeof postSchema>;
export type AIWritingSchema = z.infer<typeof aiWritingSchema>;
export type ImageGenerationSchema = z.infer<typeof imageGenerationSchema>;
