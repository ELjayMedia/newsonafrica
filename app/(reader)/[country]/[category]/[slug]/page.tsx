import { wp } from '@/lib/wp-client/rest';
import { tag } from '@/lib/cache/revalidate';
import { ArticleJsonLd as NewsArticleJsonLd } from '@/components/ArticleJsonLd';

export default async function ArticlePage({
  params,
}: {
  params: { country: string; category: string; slug: string };
}) {
  const article = await wp.article(params.slug, { tags: [tag.article(params.slug)] });
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

