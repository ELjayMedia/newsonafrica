import { WPR } from '@/lib/wp-client/rest';
import { ArticleList, type ArticleCardPost } from '~/features/articles/components/ArticleList';

export default async function CountryHome({ params }: { params: { country: string } }) {
  const posts = (await WPR.list({ country: params.country })) as ArticleCardPost[];

  return (
    <main className="max-w-4xl mx-auto">
      <ArticleList posts={posts} />
    </main>
  );
}

