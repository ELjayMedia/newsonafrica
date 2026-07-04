/**
 * Canonical article URL builder shared by content-sync and (eventually) the
 * article route itself. Centralized here so the two can't drift.
 *
 * NOTE: the reading/article route hasn't been built yet in this rebuild;
 * `/[country]/article/[slug]` mirrors the legacy app's convention. Update
 * both this function and the migrated rows (or re-run the backfill) if the
 * Reading phase picks a different URL shape.
 */
export function getArticleUrl(country: string, slug: string): string {
  return `/${country}/article/${slug}`;
}
