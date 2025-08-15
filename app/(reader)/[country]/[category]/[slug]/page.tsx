import type { Metadata, PageProps } from 'next';
import { GQL } from '@/lib/wp-client/graphql';
import { NewsArticleJsonLd } from '@/lib/seo/jsonld';
import { titleTemplate, canonicalUrl, ogImageUrl, hreflangLinks } from '@/lib/seo/meta';

type ArticlePageProps = PageProps<{
  country: string;
  category: string;
  slug: string;
}>;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { country, category, slug } = await params;
  const article = await GQL.article({ country, slug });
  if (!article) return { title: titleTemplate('Article', country) };
  const path = `/${category}/${article.slug}`;
  const canonical = canonicalUrl(country, path);
  const languages = Object.fromEntries(
    hreflangLinks(country, path).map((l) => [l.hrefLang, l.href]),
  );
  return {
    title: titleTemplate(article.title, country),
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

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { country, category, slug } = await params;
  const article = await GQL.article({ country, slug });
  if (!article) return null;
  const path = `/${category}/${article.slug}`;
  const canonical = canonicalUrl(country, path);
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
      {article.html && <div dangerouslySetInnerHTML={{ __html: article.html }} />}
    </article>
  );
}
