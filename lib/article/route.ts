/** `/{countryCode}/article/{slug}` — article pages swap the site chrome for a compact toolbar on mobile. */
const ARTICLE_PATH = /^\/[a-z]{2}\/article\/[^/]+\/?$/;

export function isArticlePath(pathname: string): boolean {
  return ARTICLE_PATH.test(pathname);
}
