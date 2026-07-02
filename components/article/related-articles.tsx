import { ArticleCard } from "@/components/article/article-card";
import type { PostSummary } from "@/lib/dal/types";

export interface RelatedArticlesProps {
  posts: PostSummary[];
  title?: string;
}

/** "You might also like" rail at the foot of an article (NOA-90). */
export function RelatedArticles({ posts, title = "You might also like" }: RelatedArticlesProps) {
  if (posts.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-4 border-t border-border pt-8">
      <h2 className="heading-md">{title}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} variant="grid" />
        ))}
      </div>
    </section>
  );
}
