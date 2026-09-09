/**
 * Cache tag helpers for tag-based fetch caching / on-demand ISR (NOA-88).
 *
 * Every WordPress fetch (REST or GraphQL) should attach the relevant tags so
 * the webhook handler can call `revalidateTag()` precisely instead of
 * blowing away the whole cache. See docs/caching-strategy.md for the full
 * strategy.
 *
 * Ported from the legacy app's `lib/cache/cacheTags.ts`, renamed from
 * "edition" to "country" terminology used by this rebuild.
 */

type CountryInput = string | null | undefined;
type IdentifierInput = string | number | null | undefined;

const FALLBACK_COUNTRY = "sz";

function normalizeCountry(country: CountryInput): string {
  if (typeof country !== "string") return FALLBACK_COUNTRY;
  const normalized = country.trim().toLowerCase();
  return normalized || FALLBACK_COUNTRY;
}

function normalizeIdentifier(value: IdentifierInput): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed.toLowerCase();
  }
  return "unknown";
}

const countryScope = (country: CountryInput, scope: string): string =>
  `country:${normalizeCountry(country)}:${scope}`;

const countryEntity = (country: CountryInput, scope: string, id: IdentifierInput): string =>
  `${countryScope(country, scope)}:${normalizeIdentifier(id)}`;

export const cacheTags = {
  country: (country: CountryInput) => `country:${normalizeCountry(country)}`,
  home: (country: CountryInput) => `home:${normalizeCountry(country)}`,
  posts: (country: CountryInput) => countryScope(country, "posts"),
  post: (country: CountryInput, postId: IdentifierInput) => countryEntity(country, "post", postId),
  postSlug: (country: CountryInput, slug: IdentifierInput) => countryEntity(country, "post-slug", slug),
  categories: (country: CountryInput) => countryScope(country, "categories"),
  category: (country: CountryInput, slug: IdentifierInput) => countryEntity(country, "category", slug),
  authors: (country: CountryInput) => countryScope(country, "authors"),
  author: (country: CountryInput, slug: IdentifierInput) => countryEntity(country, "author", slug),
  tags: (country: CountryInput) => countryScope(country, "tags"),
  tag: (country: CountryInput, slug: IdentifierInput) => countryEntity(country, "tag", slug),
  search: (country: CountryInput, query: IdentifierInput) => countryEntity(country, "search", query),
} as const;
