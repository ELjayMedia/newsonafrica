import { HomeContent } from "@/components/HomeContent";
import { getLatestPosts, getCategories } from "@/lib/api/wordpress";

interface CountryPageProps {
  params: { countryCode: string };
}

export const revalidate = 600;

export async function generateStaticParams() {
  const codes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES || "").split(",").filter(Boolean);
  return codes.map((code) => ({ countryCode: code }));
}

async function getHomePageData(code: string) {
  const results = await Promise.allSettled([
    getLatestPosts(50, undefined, code),
    getCategories(code),
  ]);
  const postsResult = results[0].status === "fulfilled" ? results[0].value : { posts: [] };
  const categoriesResult = results[1].status === "fulfilled" ? results[1].value : [];
  const posts = postsResult.posts || [];
  const initialData = {
    taggedPosts: posts.filter((p: any) =>
      p.tags?.nodes?.some((t: any) => t.slug === "fp" || t.name.toLowerCase() === "fp"),
    ),
    featuredPosts: posts.slice(0, 6),
    categories: categoriesResult,
    recentPosts: posts.slice(0, 10),
  };
  return { posts, initialData };
}

export default async function CountryHomePage({ params }: CountryPageProps) {
  const { posts, initialData } = await getHomePageData(params.countryCode);
  return <HomeContent initialPosts={posts} initialData={initialData} />;
}
