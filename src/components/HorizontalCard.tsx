'use client';

import { UnifiedCard } from './ui/unified-card';

interface HorizontalCardProps {
  post: {
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    featuredImage?: { node: { sourceUrl: string } };
    date: string;
    author?: { node: { name: string } };
  };
  className?: string;
  allowHtml?: boolean;
}

export function HorizontalCard({ allowHtml = false, ...props }: HorizontalCardProps) {
  return <UnifiedCard {...props} variant="horizontal" showExcerpt={true} allowHtml={allowHtml} />;
}
