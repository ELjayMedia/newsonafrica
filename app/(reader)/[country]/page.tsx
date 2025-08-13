import type { Metadata } from 'next';
import { WPR } from '@/lib/wp-client/rest';
import { ArticleList } from '~/features/articles/components/ArticleList';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';

export async function generateMetadata({ params }: { params: { country: string } }): Promise<Metadata> {
  const path = '/';
  const canonical = canonicalUrl(params.country, path);
  const languages = Object.fromEntries(
    hreflangLinks(params.country, path).map(l => [l.hrefLang, l.href])
  );
  return {
    title: titleTemplate('Latest News', params.country),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      url: canonical,
      title: 'Latest News',
      images: [{ url: ogImageUrl('News On Africa') }],
    },
  };
}

export default async function CountryHome({ params }: { params: { country: string } }) {
  const posts = await WPR.list({ country: params.country });

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
    </main>
  );
}

