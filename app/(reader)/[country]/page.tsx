import { wp } from '@/lib/wp-client/rest';
import { tag } from '@/lib/cache/revalidate';
import { ArticleList, type ArticleCardPost } from '~/features/articles/components/ArticleList';

export default async function CountryHome({ params }: { params: { country: string } }) {
  const posts = (await wp.list(params.country, undefined, {
    tags: [tag.list(params.country)],
  })) as ArticleCardPost[];

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
    </main>
  );
}

