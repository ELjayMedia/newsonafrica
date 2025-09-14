import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/wp-data';
import { ArticleClientContent } from './ArticleClientContent';

export const revalidate = 60;

type Params = { countryCode: string; slug: string };

export default async function Page({ params }: { params: Params }) {
  const country = (params.countryCode || 'DEFAULT').toUpperCase();
  const post = await getPostBySlug(country, params.slug);
  if (!post) notFound();
  return (
    <ArticleClientContent slug={params.slug} countryCode={country} initialData={post} />
  );
}
