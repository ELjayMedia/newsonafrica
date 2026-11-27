import { ArticleCard } from "@/components/article/article-card";
import type { PostSummary } from "@/lib/dal/types";

export interface RelatedArticlesProps {
  posts: PostSummary[];
  title?: string;
}

/**
 * "You might also like" at the foot of an article (NOA-90): the same
 * image-on-top cards as the author page's story grid, headline and meta only
 * (no excerpt), three across from sm up.
 */
export function RelatedArticles({ posts, title = "You might also like" }: RelatedArticlesProps) {
  if (posts.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-4 border-t border-border pt-8">
      <h2 className="section-title">{title}</h2>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
        {posts.map((post) => (
          <li key={`${post.country}-${post.id}`}>
            <ArticleCard post={post} variant="grid" showExcerpt={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
