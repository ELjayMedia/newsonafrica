import { ArticleCard } from "@/components/article/article-card";
import type { PostSummary } from "@/lib/dal/types";

export interface NewsGridProps {
  posts: PostSummary[];
}

/** Responsive grid of post cards for the home feed / listing pages (NOA-89). */
export function NewsGrid({ posts }: NewsGridProps) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} variant="grid" />
      ))}
    </div>
  );
}
