import { listCategories } from "@/lib/dal";
import { DEFAULT_COUNTRY, type CountryCode } from "@/lib/countries";

export interface NavSection {
  slug: string;
  name: string;
}

const NAV_SECTION_LIMIT = 5;
const EXCLUDED_SLUGS = new Set(["uncategorized"]);

/**
 * Build the primary navigation sections from WordPress categories (the busiest
 * ones first) so the header reflects the newsroom's real taxonomy instead of a
 * hard-coded link list. Editions share a taxonomy, so the default edition's
 * categories drive the global header; hrefs are made edition-aware in the
 * client header. Degrades to an empty list (Home-only nav) if WordPress is
 * unavailable — never throws.
 */
export async function getNavSections(country: CountryCode = DEFAULT_COUNTRY): Promise<NavSection[]> {
  try {
    const { items } = await listCategories({ country, perPage: 30 });
    return items
      .filter((category) => category.slug && !EXCLUDED_SLUGS.has(category.slug) && category.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, NAV_SECTION_LIMIT)
      .map((category) => ({ slug: category.slug, name: category.name }));
  } catch {
    return [];
  }
}
