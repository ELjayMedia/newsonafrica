import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';

export interface ArticleCardPost {
  slug: string;
  title: string;
  excerpt: string;
  country?: string;
  categories?: { nodes: { slug: string; name: string }[] };
  featuredImage?: { node: { sourceUrl: string; altText?: string } };
}

interface ArticleCardProps {
  post: ArticleCardPost;
}

export function ArticleCard({ post }: ArticleCardProps) {
  const category = post.categories?.nodes?.[0];
  const href = `/${[post.country, category?.slug, post.slug].filter(Boolean).join('/')}`;

  return (
    <article className="flex gap-4">
      {post.featuredImage?.node?.sourceUrl && (
        <Link href={href} className="relative w-48 h-32 flex-shrink-0">
          <Image
            src={post.featuredImage.node.sourceUrl}
            alt={post.featuredImage.node.altText || post.title}
            fill
            className="object-cover"
          />
        </Link>
      )}
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold">
          <Link href={href}>{post.title}</Link>
        </h2>
        <div
          className="text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.excerpt }}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {post.country && <Badge variant="secondary">{post.country.toUpperCase()}</Badge>}
          {category && <Badge>{category.name}</Badge>}
        </div>
      </div>
    </article>
  );
}
