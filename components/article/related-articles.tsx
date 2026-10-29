import { ArticleCard } from "@/components/article/article-card";
import type { PostSummary } from "@/lib/dal/types";

export interface RelatedArticlesProps {
  posts: PostSummary[];
  title?: string;
}

/**
 * "You might also like" at the foot of an article (NOA-90): thumbnail rows
 * rather than tall stacked cards, so the next-read options fit on one phone
 * screen.
 */
export function RelatedArticles({ posts, title = "You might also like" }: RelatedArticlesProps) {
  if (posts.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-4 border-t border-border pt-8">
      <h2 className="heading-md">{title}</h2>
      <ul className="divide-y divide-border">
        {posts.map((post) => (
          <li key={post.id} className="py-4 first:pt-0 last:pb-0">
            <ArticleCard post={post} variant="list" />
          </li>
        ))}
      </ul>
    </section>
  );
}
