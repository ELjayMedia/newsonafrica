/**
 * Six editorial verticals for News On Africa (NOA-60)
 * These define the primary navigation IA of the site.
 * Each vertical maps to a WordPress category slug.
 */

export interface EditorialVertical {
  /** Display name shown in navigation */
  name: string
  /** WordPress category slug (used in URLs: /[countryCode]/category/<slug>) */
  slug: string
  /** Short tagline shown in sub-navigation or section headers */
  tagline: string
  /** Full description for category/section pages */
  description: string
}

/**
 * The six editorial verticals, in display order.
 * These slugs must match the corresponding WordPress category slugs.
 */
export const EDITORIAL_VERTICALS: EditorialVertical[] = [
  {
    name: "The Continent",
    slug: "the-continent",
    tagline: "Hard news from across Africa",
    description:
      "Politics, elections, diplomacy, conflict, and coverage of the African Union, SADC, and AfCFTA. The stories that shape the continent.",
  },
  {
    name: "Markets & Money",
    slug: "markets-money",
    tagline: "Business, trade, and African economies",
    description:
      "Business news, entrepreneurship, investing, trade, SME stories, and African stock markets. Follow the money across the continent.",
  },
  {
    name: "Tech & Innovation",
    slug: "tech-innovation",
    tagline: "Africa's digital future",
    description:
      "The African tech ecosystem, startups, mobile money, and digital transformation. How technology is reshaping Africa.",
  },
  {
    name: "Life & Culture",
    slug: "life-culture",
    tagline: "Arts, sport, food, fashion, diaspora",
    description:
      "Arts, entertainment, sport, food, fashion, and diaspora stories. The richness of African life and culture.",
  },
  {
    name: "Health & Environment",
    slug: "health-environment",
    tagline: "Health, climate, and food security",
    description:
      "Public health, climate change, conservation, agriculture, and food security. Africa's human and environmental wellbeing.",
  },
  {
    name: "Opinion & Analysis",
    slug: "opinion-analysis",
    tagline: "Columns, longform, editorial",
    description:
      "Columns, longform analysis, editorial perspectives, and readers' letters. Thought leadership on Africa's most pressing issues.",
  },
]

/**
 * Slugs of the six verticals, in display order.
 * Used to sort navigation categories to match the editorial IA.
 */
export const VERTICAL_SLUGS = EDITORIAL_VERTICALS.map((v) => v.slug)

/**
 * Look up a vertical by its slug. Returns undefined if not found.
 */
export function getVerticalBySlug(slug: string): EditorialVertical | undefined {
  return EDITORIAL_VERTICALS.find((v) => v.slug === slug.toLowerCase())
}

/**
 * Sort a list of category slugs so that verticals appear first (in order),
 * followed by any remaining slugs alphabetically.
 */
export function sortSlugsByVerticalOrder(slugs: string[]): string[] {
  const verticalIndex = new Map(VERTICAL_SLUGS.map((slug, i) => [slug, i]))
  return [...slugs].sort((a, b) => {
    const ai = verticalIndex.get(a) ?? Infinity
    const bi = verticalIndex.get(b) ?? Infinity
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}
