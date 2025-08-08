import { HomeContent } from "@/components/HomeContent";
import { getHomePageData, EMPTY_HOME_PAGE_RESPONSE } from "@/lib/homepage";

interface CountryPageProps {
  params: { countryCode: string };
}

export const revalidate = 600;

export async function generateStaticParams() {
  const codes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES || "").split(",").filter(Boolean);
  return codes.map((code) => ({ countryCode: code }));
}

export default async function CountryHomePage({ params }: CountryPageProps) {
  try {
    const { posts, initialData } = await getHomePageData(params.countryCode);
    return <HomeContent initialPosts={posts} initialData={initialData} />;
  } catch (error) {
    console.error("Country homepage data fetch failed:", error);
    return (
      <HomeContent
        initialPosts={EMPTY_HOME_PAGE_RESPONSE.posts}
        initialData={EMPTY_HOME_PAGE_RESPONSE.initialData}
      />
    );
  }
}
