import { notFound } from 'next/navigation';
import type { PageProps } from 'next';
import { getPostBySlug } from '@/lib/wp-data';
import { fetchFromWp, type WordPressPost } from '@/lib/wordpress-api';
import { wordpressQueries } from '@/lib/wordpress-queries';
import { ArticleClientContent } from './ArticleClientContent';
import * as log from '@/lib/log';

export const revalidate = 300;

interface ArticlePageProps {
  params: { countryCode: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function Page({ params }: ArticlePageProps) {
  const country = (params.countryCode || 'DEFAULT').toUpperCase();
  let post: WordPressPost | null = null;


  try {
    post = await getPostBySlug(country, slug);
  } catch (error) {
    log.error('getPostBySlug failed', { error });
  }

  if (!post) {
    try {
      const restPosts =
        (await fetchFromWp<WordPressPost[]>(
          country,
          wordpressQueries.postBySlug(slug),
        )) || [];
      post = restPosts[0] || null;
    } catch (error) {
      log.error('REST postBySlug fetch failed', { error });
    }
  }

  if (!post) {
    return notFound();
  }

  return (
    <ArticleClientContent slug={slug} countryCode={country} initialData={post} />
  );
}
