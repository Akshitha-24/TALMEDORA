// Using localStorage for demo - replace with your actual database
const DB_KEY = 'talmedora_posts';

export interface DBPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  likes: number;
  isPublished: boolean;
}

export const db = {
  getAllPosts: (): DBPost[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  },

  getPostById: (id: string): DBPost | null => {
    const posts = db.getAllPosts();
    return posts.find(post => post.id === id) || null;
  },

  createPost: (post: Omit<DBPost, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): DBPost => {
    const posts = db.getAllPosts();
    const newPost: DBPost = {
      ...post,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
    };
    posts.unshift(newPost);
    localStorage.setItem(DB_KEY, JSON.stringify(posts));
    return newPost;
  },

  updatePost: (id: string, updates: Partial<DBPost>): DBPost | null => {
    const posts = db.getAllPosts();
    const index = posts.findIndex(post => post.id === id);
    if (index === -1) return null;
    
    posts[index] = { ...posts[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(DB_KEY, JSON.stringify(posts));
    return posts[index];
  },

  deletePost: (id: string): boolean => {
    const posts = db.getAllPosts();
    const filtered = posts.filter(post => post.id !== id);
    if (filtered.length === posts.length) return false;
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
    return true;
  },

  likePost: (id: string): DBPost | null => {
    const posts = db.getAllPosts();
    const index = posts.findIndex(post => post.id === id);
    if (index === -1) return null;
    
    posts[index].likes += 1;
    localStorage.setItem(DB_KEY, JSON.stringify(posts));
    return posts[index];
  },
};