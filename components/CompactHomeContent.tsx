'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: number;
  title: { rendered: string };
  link: string;
  date: string;
}

export default function CompactHomeContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const mockPosts: Post[] = [
          {
            id: 1,
            title: { rendered: 'Breaking: African Union Summit Updates' },
            link: '/post/au-summit',
            date: new Date().toISOString(),
          },
          {
            id: 2,
            title: { rendered: 'Economic Growth Across West Africa' },
            link: '/post/west-africa-economy',
            date: new Date().toISOString(),
          },
        ];
        setPosts(mockPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-4">Recent Updates</h2>
      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id} className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-medium leading-tight mb-1">
              <a href={post.link} className="text-gray-900 hover:text-blue-600 transition-colors">
                {post.title.rendered}
              </a>
            </h3>
            <time className="text-xs text-gray-500">
              {new Date(post.date).toLocaleDateString()}
            </time>
          </article>
        ))}
      </div>
    </div>
  );
}
