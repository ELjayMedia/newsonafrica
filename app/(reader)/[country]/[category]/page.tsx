import type { Metadata } from 'next';
import { WPR } from '@/lib/wp-client/rest';
import { ArticleList } from '~/features/articles/components/ArticleList';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';

interface CategoryPageProps {
  params: Promise<{ country: string; category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { country, category } = await params;
  const path = `/${category}`;
  const canonical = canonicalUrl(country, path);
  const languages = Object.fromEntries(
    hreflangLinks(country, path).map((l) => [l.hrefLang, l.href]),
  );
  const title = `${category}`;
  return {
    title: titleTemplate(title, country),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      images: [{ url: ogImageUrl(title) }],
    },
  };
}

export default async function CategoryHome({ params }: CategoryPageProps) {
  const { country, category } = await params;
  const posts = await WPR.list({ country, categorySlug: category });

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
    </main>
  );
}
