export interface CategoryConfig {
  /** The slug/name you type to fetch posts + link to */
  name: string
  /** How NewsGrid should render them */
  layout: "horizontal" | "vertical"
  /** Optional override for post.type */
  typeOverride?: string
  /** Inject this ad component _after_ this section? */
  showAdAfter?: boolean
}

export const categoryConfigs: CategoryConfig[] = [
  { name: "news", layout: "horizontal" },
  { name: "business", layout: "horizontal", showAdAfter: true },
  { name: "entertainment", layout: "horizontal" },
  { name: "sport", layout: "horizontal" },
  { name: "editorial", layout: "horizontal", typeOverride: "OPINION" },
  { name: "health", layout: "vertical", typeOverride: "HEALTH" },
  // To add a new category, just append here:
  // { name: "lifestyle", layout: "horizontal" },
]
