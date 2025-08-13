'use client';
import Link from 'next/link';

import type { WordPressPost } from '@/lib/api/wordpress';

interface Props {
  posts: WordPressPost[];
}

export function MostRead({ posts }: Props) {
  return (
    <div>
      <h3 className="font-semibold mb-2">Most Read</h3>
      <ol className="space-y-2 text-sm">
        {posts.map((p, i) => (
          <li key={p.id} className="flex gap-2">
            <span className="font-bold">{i + 1}.</span>
            <Link href={`/post/${p.slug}`} className="hover:underline line-clamp-2">
              {p.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
