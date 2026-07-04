import Link from "next/link";

import { formatDate } from "@/lib/format";
import type { MostReadPost } from "@/lib/dal/types";

export interface MostReadRailProps {
  posts: MostReadPost[];
  title?: string;
}

/** Sidebar rail of the most-read posts for a country (NOA-89), from Supabase `most_read_content`. */
export function MostReadRail({ posts, title = "Most read" }: MostReadRailProps) {
  if (posts.length === 0) return null;

  return (
    <aside aria-label={title} className="space-y-4">
      <h2 className="heading-sm border-b-2 border-primary pb-2">{title}</h2>

      <ol className="space-y-4">
        {posts.map((post, index) => (
          <li key={post.id} className="flex items-start gap-3">
            <span className="display-lg w-8 flex-shrink-0 text-muted-foreground/40" aria-hidden>
              {index + 1}
            </span>
            <div className="flex-1 space-y-1">
              <h3 className="ui-md leading-snug">
                <Link href={post.url} className="transition-colors hover:text-primary">
                  {post.title}
                </Link>
              </h3>
              <time dateTime={post.publishedAt} className="ui-sm text-muted-foreground">
                {formatDate(post.publishedAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
