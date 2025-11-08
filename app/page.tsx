import { HomeContent } from "@/components/HomeContent";
import { getSiteBaseUrl } from "@/lib/site-url";

import { HOME_FEED_REVALIDATE, buildHomeContentProps } from "./(home)/home-data";

export const dynamic = "force-static";
export const revalidate = 60;

if (process.env.NODE_ENV !== "production" && revalidate !== HOME_FEED_REVALIDATE) {
  throw new Error(
    `Home feed revalidate interval mismatch: page=${revalidate}, data=${HOME_FEED_REVALIDATE}`,
  );
}

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
