import { notFound } from 'next/navigation';
import type { PageProps } from 'next';
import { getPostBySlugForCountry } from '@/lib/wp-data';
import { fetchFromWp, type WordPressPost } from '@/lib/wordpress-api';
import { wordpressQueries } from '@/lib/wordpress-queries';
import { ArticleClientContent } from './ArticleClientContent';

export const revalidate = 60;

export default async function Page({
  params,
}: PageProps<{ countryCode: string; slug: string }>) {
  const { countryCode, slug } = await params;
  const country = (countryCode || 'DEFAULT').toUpperCase();
  let post;

  try {
    post = await getPostBySlugForCountry(country, slug);
  } catch (error) {
    console.error('GraphQL getPostBySlug failed, falling back to REST', error);
  }

  if (!post) {
    try {
      const restPosts =
        (await fetchFromWp<WordPressPost[]>(
          country,
          wordpressQueries.postBySlug(slug),
        )) || [];
      post = restPosts[0];
    } catch (error) {
      console.error('REST postBySlug fetch failed', error);
    }
  }

  if (!post) notFound();

  return (
    <ArticleClientContent slug={slug} countryCode={country} initialData={post} />
  );
}
