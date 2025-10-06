import { notFound } from "next/navigation";
import { getLatestPosts, isSupportedCountry } from "@/lib/wp";

export const dynamic = "force-static";
export const revalidate = 60;

type Props = { params: { countryCode: string } };

export default async function CountryPage({ params }: Props) {
  const { countryCode } = params;
  if (!isSupportedCountry(countryCode)) return notFound();

  const posts = await getLatestPosts(countryCode, 20).catch(() => []);
  return (
    <main className="container mx-auto px-4">
      <h1 className="text-xl font-semibold uppercase">{countryCode} Edition</h1>
      <section>{/* grid of posts */}</section>
    </main>
  );
}
