import { notFound } from "next/navigation";
import { getPostBySlug, isSupportedCountry } from "@/lib/wp";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Props = { params: { countryCode: string; slug: string } };

export default async function ArticlePage({ params }: Props) {
  const { countryCode, slug } = params;
  if (!isSupportedCountry(countryCode)) return notFound();

  const post = await getPostBySlug(countryCode, slug).catch(() => null);
  if (!post) return notFound();

  return (
    <article className="container mx-auto px-4 prose max-w-3xl">
      <h1 dangerouslySetInnerHTML={{ __html: post.title?.rendered || "" }} />
      <div dangerouslySetInnerHTML={{ __html: post.content?.rendered || "" }} />
    </article>
  );
}
