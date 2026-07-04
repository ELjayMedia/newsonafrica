import type { Metadata } from "next";
import Link from "next/link";

import { ModerationControls } from "@/components/admin/moderation-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isModerationStatusFilter,
  listCommentsForModeration,
  MODERATION_STATUS_FILTERS,
  type ModerationStatusFilter,
} from "@/lib/dal/comments";
import { formatDate } from "@/lib/format";
import type { CommentStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Comment moderation",
  description: "Review and moderate reader comments.",
};

const FILTER_LABELS: Record<ModerationStatusFilter, string> = {
  all: "All",
  approved: "Approved",
  pending: "Pending",
  hidden: "Hidden",
  deleted: "Deleted",
};

const STATUS_BADGE_VARIANT: Record<CommentStatus, "default" | "secondary" | "outline"> = {
  approved: "default",
  pending: "secondary",
  hidden: "outline",
  deleted: "outline",
};

function moderationHref(status: ModerationStatusFilter, page: number): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/account/admin/comments?${query}` : "/account/admin/comments";
}

/**
 * Comment moderation admin (NOA-102). Gated by `requireAdmin()`: signed-out
 * visitors are redirected to /login and signed-in non-admins get the site's
 * clean 404 page — the not-authorized state deliberately doesn't advertise
 * that an admin area exists. Reads use the service-role client (all
 * statuses, site-wide); writes go through `moderateCommentAction`.
 */
export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin("/account/admin/comments");

  const params = await searchParams;
  const status: ModerationStatusFilter =
    params.status && isModerationStatusFilter(params.status) ? params.status : "all";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const result = await listCommentsForModeration({ status, page });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Comment moderation</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Approve, hide or delete reader comments. Hidden comments stay visible to their author only; deleting clears
          the body and keeps a stub so threads stay intact.
        </p>
      </div>

      <nav aria-label="Filter comments by status" className="flex flex-wrap gap-2">
        {MODERATION_STATUS_FILTERS.map((filter) => (
          <Link
            key={filter}
            href={moderationHref(filter, 1)}
            aria-current={filter === status ? "page" : undefined}
            className={cn(
              "ui-sm rounded-full border px-3 py-1 transition-colors",
              filter === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {FILTER_LABELS[filter]}
          </Link>
        ))}
      </nav>

      {result.comments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="body-md text-muted-foreground">
              {page > 1
                ? "No comments on this page."
                : status === "all"
                  ? "No comments yet."
                  : `No ${FILTER_LABELS[status].toLowerCase()} comments.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.comments.map((comment) => (
            <li key={comment.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[comment.status]}>{comment.status}</Badge>
                    {comment.isReply ? <Badge variant="outline">Reply</Badge> : null}
                    <span className="body-sm text-muted-foreground">
                      {comment.author?.displayName?.trim() || "Unknown reader"} · {formatDate(comment.createdAt)}
                      {comment.editedAt ? " · edited" : ""}
                    </span>
                  </div>

                  <p className="body-sm text-muted-foreground">
                    On:{" "}
                    {comment.articleUrl ? (
                      <Link
                        href={comment.articleUrl}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {comment.articleTitle ?? comment.articleUrl}
                      </Link>
                    ) : (
                      <span>
                        {comment.country.toUpperCase()} article #{comment.wpPostId}
                      </span>
                    )}
                  </p>

                  {comment.status === "deleted" ? (
                    <p className="body-md italic text-muted-foreground">Comment deleted — body removed.</p>
                  ) : (
                    <p className="body-md whitespace-pre-wrap break-words">{comment.body}</p>
                  )}

                  <ModerationControls commentId={comment.id} status={comment.status} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {page > 1 || result.hasMore ? (
        <nav aria-label="Moderation pages" className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={moderationHref(status, page - 1)}
              className="ui-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Newer comments
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {result.hasMore ? (
            <Link
              href={moderationHref(status, page + 1)}
              className="ui-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Older comments
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
