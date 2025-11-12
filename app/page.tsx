import { HomeContent } from "@/components/HomeContent";
import { getSiteBaseUrl } from "@/lib/site-url";

import { buildHomeContentProps } from "./(home)/home-data";

const HOME_PAGE_REVALIDATE_SECONDS = 5 * 60;

export const revalidate = HOME_PAGE_REVALIDATE_SECONDS;

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
