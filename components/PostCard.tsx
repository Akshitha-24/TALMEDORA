import { useState } from 'react';
import { Post } from '@/types/post';

interface PostCardProps {
  post: Post;
}

function isHtmlString(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const contentHtml = isHtmlString(post.content)
    ? post.content
    : post.content.replace(/\n/g, '<br />');

  const plainTextContent = plainText(post.content);
  const shouldShowToggle = plainTextContent.length > 180;
  const firstHeading = plainText(post.content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const displayTitle = post.title.trim();
  const shouldShowTitle =
    displayTitle &&
    displayTitle !== 'Create New Post' &&
    displayTitle.toLowerCase() !== firstHeading.toLowerCase();

  return (
    <article className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {post.imageUrl && (
        <img src={post.imageUrl} alt={displayTitle || 'Post image'} className="w-full h-48 object-contain bg-gray-50" />
      )}

      <div className="p-6">
        {shouldShowTitle && (
          <h2 className="text-xl font-bold text-gray-900 mb-2">{displayTitle}</h2>
        )}

        {post.author && (
          <p className="text-sm text-gray-500 mb-3">By {post.author}</p>
        )}

        <div
          className={`text-gray-600 text-sm mb-4 ${expanded ? '' : 'line-clamp-3'}`}
          dangerouslySetInnerHTML={{
            __html: contentHtml,
          }}
        />

        {shouldShowToggle && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-indigo-600 text-sm font-medium mb-4 hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          {new Date(post.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </article>
  );
}
