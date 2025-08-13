import { Article } from './schema';

/**
 * Performs editorial hygiene checks on an Article.
 * In development, logs warnings when constraints are violated.
 */
export function validateArticle(article: Article): void {
  if (process.env.NODE_ENV === 'production') return;

  const warn = (msg: string) => console.warn(`Article ${article.id}: ${msg}`);

  if (article.title && article.title.length > 110) {
    warn(`headline exceeds 110 characters`);
  }
  if (article.excerpt && article.excerpt.length > 240) {
    warn(`summary exceeds 240 characters`);
  }
  if (!/\d{4}-\d{2}-\d{2}T/.test(article.publishedAt)) {
    warn(`publishedAt is not ISO 8601`);
  }
  if (article.html) {
    const imgTags = article.html.match(/<img[^>]*>/gi) || [];
    imgTags.forEach(tag => {
      if (!/ alt=/.test(tag)) {
        warn(`image tag missing alt attribute`);
      }
    });
  }
}
