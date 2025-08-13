interface NewsArticleJsonLdProps {
  url: string;
  title: string;
  images?: string[];
  datePublished: string;
  dateModified?: string;
  authorName: string;
}

/**
 * Renders JSON-LD structured data for a news article.
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/news-article
 */
export function NewsArticleJsonLd({
  url,
  title,
  images = [],
  datePublished,
  dateModified,
  authorName,
}: NewsArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: title,
    image: images,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      '@type': 'Person',
      name: authorName,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default NewsArticleJsonLd;
