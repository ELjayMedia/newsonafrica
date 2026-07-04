import Link from "next/link";

import { CommentForm } from "@/components/comments/comment-form";
import { CommentItem } from "@/components/comments/comment-item";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { decodeCommentCursor } from "@/lib/comments/cursor";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { listComments } from "@/lib/dal/comments";

/** Query param carrying the comments cursor on article pages. */
export const COMMENTS_CURSOR_PARAM = "comments";

/**
 * Article comment section (NOA-101): post form (auth-gated), threaded list,
 * cursor-paginated "older comments" navigation. Server-rendered so RLS
 * decides visibility per viewer and mutations surface via revalidatePath.
 */
export async function CommentSection({
  country,
  slug,
  wpPostId,
  cursorParam,
}: {
  country: string;
  slug: string;
  wpPostId: number;
  cursorParam?: string;
}) {
  const user = await getUser();
  const cursor = decodeCommentCursor(cursorParam);
  const { comments, nextCursor, approvedCount } = await listComments({
    country,
    wpPostId,
    cursor,
  });

  const articlePath = getArticleUrl(country, slug);
  const signInHref = `/login?next=${encodeURIComponent(articlePath)}`;

  return (
    <section id="comments" aria-label="Comments" className="space-y-6 border-t border-border pt-8">
      <h2 className="heading-md">
        Comments{approvedCount > 0 ? ` (${approvedCount})` : ""}
      </h2>

      {user ? (
        <CommentForm country={country} slug={slug} wpPostId={wpPostId} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <p className="body-md text-muted-foreground">Sign in to join the discussion.</p>
          <Link href={signInHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Sign in
          </Link>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="body-md text-muted-foreground">
          {cursor ? "No more comments." : "No comments yet. Be the first to share your thoughts."}
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              country={country}
              slug={slug}
              wpPostId={wpPostId}
              currentUserId={user?.id ?? null}
            />
          ))}
        </ul>
      )}

      {nextCursor || cursor ? (
        <nav aria-label="Comments pagination" className="flex items-center gap-3">
          {nextCursor ? (
            <Link
              href={`${articlePath}?${COMMENTS_CURSOR_PARAM}=${encodeURIComponent(nextCursor)}#comments`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Older comments
            </Link>
          ) : null}
          {cursor ? (
            <Link
              href={`${articlePath}#comments`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Back to newest
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
