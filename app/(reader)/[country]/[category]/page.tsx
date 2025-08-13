import { wp } from '@/lib/wp-client/rest';
import { tag } from '@/lib/cache/revalidate';

export default async function CategoryHome({ params }: { params: { country: string; category: string } }) {
  const posts = await wp.list(params.country, params.category, {
    tags: [tag.list(params.country, params.category)],
  });
  return <main className="max-w-4xl mx-auto">{/* map posts into ArticleCard */}</main>;
}

