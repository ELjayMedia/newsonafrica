import type { Metadata } from 'next';
import { WPR } from '@/lib/wp-client/rest';
import { ArticleList } from '~/features/articles/components/ArticleList';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';

export async function generateMetadata({
  params,
}: {
  params: { country: string; category: string };
}): Promise<Metadata> {
  const path = `/${params.category}`;
  const canonical = canonicalUrl(params.country, path);
  const languages = Object.fromEntries(
    hreflangLinks(params.country, path).map(l => [l.hrefLang, l.href])
  );
  const title = `${params.category}`;
  return {
    title: titleTemplate(title, params.country),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      images: [{ url: ogImageUrl(title) }],
    },
  };
}

export default async function CategoryHome({ params }: { params: { country: string; category: string } }) {
  const posts = await WPR.list({ country: params.country, categorySlug: params.category });

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
    </main>
  );
}

