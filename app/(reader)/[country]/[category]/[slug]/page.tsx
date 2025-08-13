import { GQL } from '@/lib/wp-client/graphql';
import { ArticleJsonLd as NewsArticleJsonLd } from '@/components/ArticleJsonLd';

export default async function ArticlePage({
  params,
}: {
  params: { country: string; category: string; slug: string };
}) {
  const article = await GQL.article({ country: params.country, slug: params.slug });
  return (
    <article className="max-w-4xl mx-auto">
      <NewsArticleJsonLd
        post={article}
        url={`/${params.country}/${params.category}/${params.slug}`}
      />
      {/* render article content */}
    </article>
  );
}

