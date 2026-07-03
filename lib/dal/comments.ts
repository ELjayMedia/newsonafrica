/**
 * Comment data access (NOA-101). Uses the cookie-bound server client so RLS
 * decides visibility per viewer (everyone sees approved comments + deleted
 * stubs; authors additionally see their own pending/hidden ones).
 *
 * Read failures degrade to an empty page — the article renders without its
 * comment section content rather than crashing when Supabase is down.
 */
import "server-only";

import {
  buildCursorConditions,
  encodeCommentCursor,
  type CommentCursor,
  type CommentSort,
} from "@/lib/comments/cursor";
import { buildCommentTree, type CommentNode } from "@/lib/comments/thread";
import { createClient } from "@/lib/supabase/server";
import type { CommentRow, CommentStatus } from "@/lib/supabase/types";

export const COMMENTS_PAGE_SIZE = 10;

export interface CommentAuthor {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** A serializable comment for the UI: row fields + author + nested replies. */
export interface CommentTreeItem {
  id: string;
  parentId: string | null;
  userId: string;
  body: string;
  status: CommentStatus;
  createdAt: string;
  editedAt: string | null;
  author: CommentAuthor | null;
  replies: CommentTreeItem[];
}

export interface CommentPage {
  comments: CommentTreeItem[];
  /** Encoded cursor for the next page of top-level comments, or null at the end. */
  nextCursor: string | null;
  /** Publicly visible (approved) comment count for the article. */
  approvedCount: number;
}

function toTreeItem(
  node: CommentNode<CommentRow>,
  authors: Map<string, CommentAuthor>,
): CommentTreeItem {
  return {
    id: node.id,
    parentId: node.parent_id,
    userId: node.user_id,
    // Never ship deleted body remnants to the client, whatever is stored.
    body: node.status === "deleted" ? "" : node.body,
    status: node.status,
    createdAt: node.created_at,
    editedAt: node.edited_at,
    author: node.status === "deleted" ? null : (authors.get(node.user_id) ?? null),
    replies: node.replies.map((reply) => toTreeItem(reply, authors)),
  };
}

/**
 * One cursor-page of top-level comments (newest first by default) with all
 * replies of those threads nested underneath.
 */
export async function listComments(params: {
  country: string;
  wpPostId: number;
  cursor?: CommentCursor | null;
  sort?: CommentSort;
  limit?: number;
}): Promise<CommentPage> {
  const sort = params.sort ?? "newest";
  const limit = Math.min(Math.max(params.limit ?? COMMENTS_PAGE_SIZE, 1), 50);
  const empty: CommentPage = { comments: [], nextCursor: null, approvedCount: 0 };

  try {
    const supabase = await createClient();

    // 1. Cursor-page of thread roots. RLS filters visibility.
    let rootsQuery = supabase
      .from("comments")
      .select("*")
      .eq("country", params.country)
      .eq("wp_post_id", params.wpPostId)
      .is("parent_id", null)
      .order("created_at", { ascending: sort === "oldest" })
      .order("id", { ascending: sort === "oldest" })
      .limit(limit + 1);

    const conditions = buildCursorConditions(sort, params.cursor ?? null);
    if (conditions.length > 0) {
      rootsQuery = rootsQuery.or(conditions.join(","));
    }

    const { data: rootRows, error: rootsError } = await rootsQuery;
    if (rootsError) {
      console.warn(`Failed to list comments for ${params.country}/${params.wpPostId}: ${rootsError.message}`);
      return empty;
    }

    const hasMore = (rootRows ?? []).length > limit;
    const roots = (rootRows ?? []).slice(0, limit);

    // 2. Every reply belonging to this page's threads, plus 3. author
    //    profiles and 4. the public approved count — fetched concurrently.
    const rootIds = roots.map((row) => row.id);

    const [repliesResult, countResult] = await Promise.all([
      rootIds.length > 0
        ? supabase
            .from("comments")
            .select("*")
            .in("root_id", rootIds)
            .not("parent_id", "is", null)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as CommentRow[], error: null }),
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("country", params.country)
        .eq("wp_post_id", params.wpPostId)
        .eq("status", "approved"),
    ]);

    if (repliesResult.error) {
      console.warn(`Failed to load replies for ${params.country}/${params.wpPostId}: ${repliesResult.error.message}`);
    }
    const replies = repliesResult.error ? [] : (repliesResult.data ?? []);
    const approvedCount = countResult.error ? 0 : (countResult.count ?? 0);

    const userIds = Array.from(
      new Set(
        [...roots, ...replies]
          .filter((row) => row.status !== "deleted")
          .map((row) => row.user_id),
      ),
    );

    const authors = new Map<string, CommentAuthor>();
    if (userIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.warn(`Failed to load comment authors: ${profilesError.message}`);
      }
      for (const profile of profileRows ?? []) {
        authors.set(profile.id, {
          id: profile.id,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
        });
      }
    }

    const tree = buildCommentTree(roots, replies);
    const last = roots[roots.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCommentCursor({ sort, createdAt: last.created_at, id: last.id })
        : null;

    return {
      comments: tree.map((node) => toTreeItem(node, authors)),
      nextCursor,
      approvedCount,
    };
  } catch (error) {
    console.warn("Comment list skipped:", error);
    return empty;
  }
}
