import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/wp-data';
import { fetchFromWp, type WordPressPost } from '@/lib/wordpress-api';
import { wordpressQueries } from '@/lib/wordpress-queries';
import { ArticleClientContent } from './ArticleClientContent';

export const revalidate = 60;

interface ArticlePageProps {
  params: { countryCode: string; slug: string };
}

export default async function Page({ params }: ArticlePageProps) {
  const country = (params.countryCode || 'DEFAULT').toUpperCase();
  let post;

  try {
    post = await getPostBySlug(country, params.slug);
  } catch (error) {
    console.error('GraphQL getPostBySlug failed, falling back to REST', error);
  }

  if (!post) {
    try {
      const restPosts =
        (await fetchFromWp<WordPressPost[]>(
          country,
          wordpressQueries.postBySlug(params.slug),
        )) || [];
      post = restPosts[0];
    } catch (error) {
      console.error('REST postBySlug fetch failed', error);
    }
  }

  if (!post) notFound();

  return (
    <ArticleClientContent slug={params.slug} countryCode={country} initialData={post} />
  );
}
