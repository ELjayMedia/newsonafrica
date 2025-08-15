import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { TagContent } from '@/components/TagContent';
import { TagPageSkeleton } from '@/components/TagPageSkeleton';
import { fetchPostsByTag, fetchSingleTag } from '@/lib/wordpress-api';

export const revalidate = 60; // Revalidate every 60 seconds

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await fetchSingleTag(slug);
  if (!tag) return { title: 'Tag Not Found' };

  return {
    title: `${tag.name} - News On Africa`,
    description: `Articles tagged with ${tag.name} on News On Africa`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<TagPageSkeleton />}>
      <TagWrapper slug={slug} />
    </Suspense>
  );
}

async function TagWrapper({ slug }: { slug: string }) {
  const tag = await fetchSingleTag(slug);
  if (!tag) notFound();

  const initialData = await fetchPostsByTag(slug);
  return <TagContent slug={slug} initialData={initialData} tag={tag} />;
}
