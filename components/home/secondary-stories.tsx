import { ArticleCard } from "@/components/article/article-card";
import type { PostSummary } from "@/lib/dal/types";

export interface SecondaryStoriesProps {
  posts: PostSummary[];
}

/** Row of "next up" stories beneath the hero on the country home page (NOA-89). */
export function SecondaryStories({ posts }: SecondaryStoriesProps) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} variant="compact" />
      ))}
    </div>
  );
}
