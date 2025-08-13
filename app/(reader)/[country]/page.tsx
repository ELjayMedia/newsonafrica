import { wp } from '@/lib/wp-client/rest';
import { tag } from '@/lib/cache/revalidate';

export default async function CountryHome({ params }: { params: { country: string } }) {
  const posts = await wp.list(params.country, undefined, { tags: [tag.list(params.country)] });
  return <main className="max-w-4xl mx-auto">{/* map posts into ArticleCard */}</main>;
}

