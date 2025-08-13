import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import type { Article } from '@/features/articles/schema';

interface ArticleCardProps {
  post: Article;
}

export function ArticleCard({ post }: ArticleCardProps) {
  const category = post.categorySlugs?.[0];
  const href = `/${[post.country, category, post.slug].filter(Boolean).join('/')}`;

  return (
    <article className="flex gap-4">
      {post.image?.src && (
        <Link href={href} className="relative w-48 h-32 flex-shrink-0">
          <Image
            src={post.image.src}
            alt={post.image.alt || post.title}
            fill
            className="object-cover"
          />
        </Link>
      )}
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold">
          <Link href={href}>{post.title}</Link>
        </h2>
        {post.excerpt && (
          <div
            className="text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {post.country && <Badge variant="secondary">{post.country.toUpperCase()}</Badge>}
          {category && <Badge>{category}</Badge>}
        </div>
      </div>
    </article>
  );
}
