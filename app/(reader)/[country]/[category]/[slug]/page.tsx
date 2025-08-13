import type { Metadata } from 'next';
import { GQL } from '@/lib/wp-client/graphql';
import { NewsArticleJsonLd } from '@/lib/seo/jsonld';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';

export async function generateMetadata({
  params,
}: {
  params: { country: string; category: string; slug: string };
}): Promise<Metadata> {
  const article = await GQL.article({ country: params.country, slug: params.slug });
  if (!article)
    return { title: titleTemplate('Article', params.country) };
  const path = `/${params.category}/${article.slug}`;
  const canonical = canonicalUrl(params.country, path);
  const languages = Object.fromEntries(
    hreflangLinks(params.country, path).map(l => [l.hrefLang, l.href])
  );
  return {
    title: titleTemplate(article.title, params.country),
    description: article.excerpt,
    alternates: { canonical, languages },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      url: canonical,
      images: [{ url: ogImageUrl(article.title, article.image?.src) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [ogImageUrl(article.title, article.image?.src)],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { country: string; category: string; slug: string };
}) {
  const article = await GQL.article({ country: params.country, slug: params.slug });
  if (!article) return null;
  const path = `/${params.category}/${article.slug}`;
  const canonical = canonicalUrl(params.country, path);
  return (
    <article className="max-w-4xl mx-auto">
      <NewsArticleJsonLd
        url={canonical}
        title={article.title}
        images={article.image ? [article.image.src] : []}
        datePublished={article.publishedAt}
        dateModified={article.updatedAt}
        authorName={article.authorName || ''}
        publisherName="News On Africa"
      />
      {article.html && (
        <div dangerouslySetInnerHTML={{ __html: article.html }} />
      )}
    </article>
  );
}

