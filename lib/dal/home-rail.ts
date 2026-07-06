import "server-only";

import { createLogger } from "@/lib/log";
import { isValidCountry, listCountries } from "@/lib/dal/countries";
import { getMostReadPosts } from "@/lib/dal/most-read";
import { listPosts } from "@/lib/dal/posts";
import type { MostReadPost, PostSummary } from "@/lib/dal/types";

const MOST_READ_COUNT = 6;
const RAIL_LATEST_COUNT = 4;
const PAN_AFRICAN_POSTS_PER_COUNTRY = 4;

const log = createLogger("home-rail-data");

export interface HomeRailData {
  mostRead: MostReadPost[];
  latest: PostSummary[];
}

function getPostSortTime(post: PostSummary): number {
  const timestamp = Date.parse(post.publishedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function listLatestPosts(country: string, perPage = RAIL_LATEST_COUNT): Promise<PostSummary[]> {
  try {
    const { items } = await listPosts({ country, perPage });
    return items;
  } catch (error) {
    log.warn("Rail latest feed unavailable", { country, err: error });
    return [];
  }
}

/**
 * Shared desktop right-rail data used by listing, article, search and account
 * surfaces so those pages inherit the same monetised sidebar composition as the
 * homepage: Most Read, MPU, Latest News and sticky half-page ad.
 */
export async function getHomeRailData(countryCode?: string): Promise<HomeRailData> {
  const country = countryCode?.toLowerCase();

  if (country && isValidCountry(country)) {
    const [mostRead, latest] = await Promise.all([
      getMostReadPosts(country, MOST_READ_COUNT),
      listLatestPosts(country, RAIL_LATEST_COUNT),
    ]);

    return { mostRead, latest };
  }

  const countryFeeds = await Promise.all(
    listCountries().map((edition) => listLatestPosts(edition.code, PAN_AFRICAN_POSTS_PER_COUNTRY)),
  );

  return {
    // There is no pan-African Most Read RPC yet, so non-edition surfaces lead
    // with Latest News and the same ad units used by the homepage rail.
    mostRead: [],
    latest: countryFeeds
      .flat()
      .sort((a, b) => getPostSortTime(b) - getPostSortTime(a))
      .slice(0, RAIL_LATEST_COUNT),
  };
}
