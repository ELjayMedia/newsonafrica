import { HomeContent } from "@/components/HomeContent";
import { getSiteBaseUrl } from "@/lib/site-url";
import { buildHomeContentProps } from "./home-data";

// Matches CACHE_DURATIONS.MEDIUM (5 minutes) to align with home feed caching.
export const revalidate = 300;

export default async function Page() {
  const baseUrl = getSiteBaseUrl();
  const { initialPosts, featuredPosts, countryPosts, initialData } =
    await buildHomeContentProps(baseUrl);

  return (
    <HomeContent
      initialPosts={initialPosts}
      featuredPosts={featuredPosts}
      countryPosts={countryPosts}
      initialData={initialData}
    />
  );
}
