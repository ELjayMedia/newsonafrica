import { HomeContent } from "@/components/HomeContent";
import { getSiteBaseUrl } from "@/lib/site-url";

import { HOME_FEED_REVALIDATE, buildHomeContentProps } from "./(home)/home-data";

const HOME_PAGE_REVALIDATE = HOME_FEED_REVALIDATE;

export const revalidate = HOME_PAGE_REVALIDATE;

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
