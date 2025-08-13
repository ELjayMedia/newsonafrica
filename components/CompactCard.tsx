'use client';

import { UnifiedCard } from './ui/unified-card';

interface CompactCardProps {
  post: {
    id: string;
    title: string;
    excerpt?: string;
    slug: string;
    featuredImage?: { node: { sourceUrl: string } } | { sourceUrl: string };
    date: string;
    author?: { node: { name: string } };
    categories?: { nodes: Array<{ name: string; slug: string }> };
  };
  layout?: 'horizontal' | 'vertical' | 'minimal';
  showExcerpt?: boolean;
  className?: string;
}

export function CompactCard({ layout = 'horizontal', ...props }: CompactCardProps) {
  return <UnifiedCard {...props} variant={layout} />;
}
