import type { Metadata } from 'next';
import { WPR } from '@/lib/wp-client/rest';
import { ArticleList } from '~/features/articles/components/ArticleList';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';
import ForYouSlot from '@/features/personalization/ForYouSlot';
import { Suspense } from 'react';

interface CountryPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { country } = await params;
  const path = '/';
  const canonical = canonicalUrl(country, path);
  const languages = Object.fromEntries(
    hreflangLinks(country, path).map((l) => [l.hrefLang, l.href]),
  );
  return {
    title: titleTemplate('Latest News', country),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      url: canonical,
      title: 'Latest News',
      images: [{ url: ogImageUrl('News On Africa') }],
    },
  };
}

export default async function CountryHome({ params }: CountryPageProps) {
  const { country } = await params;
  const posts = await WPR.list({ country });

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
      <Suspense fallback={null}>
        <ForYouSlot country={country} />
      </Suspense>
    </main>
  );
}
