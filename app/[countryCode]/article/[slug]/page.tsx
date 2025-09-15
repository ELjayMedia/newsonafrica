import { notFound } from 'next/navigation';
import type { PageProps } from 'next';
import { getPostBySlugForCountry } from '@/lib/wp-data';
import { ArticleClientContent } from './ArticleClientContent';

export const revalidate = 60;

export default async function Page({
  params,
}: PageProps<{ countryCode: string; slug: string }>) {
  const { countryCode, slug } = await params;
  const country = (countryCode || 'DEFAULT').toUpperCase();
  const post = await getPostBySlugForCountry(country, slug);

  if (!post) notFound();

  return (
    <ArticleClientContent slug={slug} countryCode={country} initialData={post} />
  );
}
