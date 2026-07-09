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
import { createLogger } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CommentRow, CommentStatus } from "@/lib/supabase/types";

const log = createLogger("dal:comments");

export const COMMENTS_PAGE_SIZE = 10;
export const MODERATION_PAGE_SIZE = 20;

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
      log.warn("Failed to list comments", { country: params.country, wpPostId: params.wpPostId, error: rootsError.message });
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
      log.warn("Failed to load replies", { country: params.country, wpPostId: params.wpPostId, error: repliesResult.error.message });
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
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        log.warn("Failed to load comment authors", { error: profilesError.message });
      }
      for (const profile of profileRows ?? []) {
        authors.set(profile.id, {
          id: profile.id,
          displayName: profile.full_name,
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
    log.warn("Comment list skipped", { err: error });
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Moderation reads (NOA-102)
// ---------------------------------------------------------------------------

export type ModerationStatusFilter = CommentStatus | "all";

export const MODERATION_STATUS_FILTERS: readonly ModerationStatusFilter[] = [
  "all",
  "approved",
  "pending",
  "hidden",
  "deleted",
];

export function isModerationStatusFilter(value: string): value is ModerationStatusFilter {
  return (MODERATION_STATUS_FILTERS as readonly string[]).includes(value);
}

export interface ModerationCommentItem {
  id: string;
  country: string;
  wpPostId: number;
  body: string;
  status: CommentStatus;
  isReply: boolean;
  createdAt: string;
  editedAt: string | null;
  author: CommentAuthor | null;
  /** Article headline from content_index, when the article is indexed. */
  articleTitle: string | null;
  /** Canonical article path from content_index, when known. */
  articleUrl: string | null;
}

export interface ModerationCommentPage {
  comments: ModerationCommentItem[];
  /** 1-based page that was fetched. */
  page: number;
  hasMore: boolean;
}

/**
 * Site-wide comment list for the moderation admin (NOA-102), newest first,
 * optionally filtered by status. Uses the service-role client so moderators
 * see every comment regardless of the viewer-scoped RLS policies — callers
 * MUST be behind `requireAdmin()`.
 */
export async function listCommentsForModeration(params: {
  status?: ModerationStatusFilter;
  page?: number;
}): Promise<ModerationCommentPage> {
  const status = params.status ?? "all";
  const page = Math.max(params.page ?? 1, 1);
  const offset = (page - 1) * MODERATION_PAGE_SIZE;
  const empty: ModerationCommentPage = { comments: [], page, hasMore: false };

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      // One extra row to detect a next page.
      .range(offset, offset + MODERATION_PAGE_SIZE);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: rows, error } = await query;
    if (error) {
      log.warn("Failed to list comments for moderation", { error: error.message });
      return empty;
    }

    const hasMore = (rows ?? []).length > MODERATION_PAGE_SIZE;
    const comments = (rows ?? []).slice(0, MODERATION_PAGE_SIZE);
    if (comments.length === 0) {
      return { comments: [], page, hasMore: false };
    }

    // Authors + article metadata for this page, fetched concurrently. Both
    // are decoration — failures degrade to a list without names/titles.
    const userIds = Array.from(new Set(comments.map((row) => row.user_id)));
    const postIds = Array.from(new Set(comments.map((row) => row.wp_post_id)));

    const [profilesResult, articlesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
      supabase.from("content_index").select("edition_code, wp_post_id, title, url_path").in("wp_post_id", postIds),
    ]);

    if (profilesResult.error) {
      log.warn("Failed to load moderation authors", { error: profilesResult.error.message });
    }
    if (articlesResult.error) {
      log.warn("Failed to load moderation article titles", { error: articlesResult.error.message });
    }

    const authors = new Map<string, CommentAuthor>();
    for (const profile of profilesResult.data ?? []) {
      authors.set(profile.id, {
        id: profile.id,
        displayName: profile.full_name,
        avatarUrl: profile.avatar_url,
      });
    }

    // wp_post_id is only unique per country, so key articles by the pair.
    const articles = new Map<string, { title: string; urlPath: string }>();
    for (const article of articlesResult.data ?? []) {
      articles.set(`${article.edition_code}:${article.wp_post_id}`, {
        title: article.title,
        urlPath: article.url_path,
      });
    }

    return {
      comments: comments.map((row) => {
        const article = articles.get(`${row.country}:${row.wp_post_id}`) ?? null;
        return {
          id: row.id,
          country: row.country,
          wpPostId: row.wp_post_id,
          body: row.status === "deleted" ? "" : row.body,
          status: row.status,
          isReply: row.parent_id !== null,
          createdAt: row.created_at,
          editedAt: row.edited_at,
          author: authors.get(row.user_id) ?? null,
          articleTitle: article?.title ?? null,
          articleUrl: article?.urlPath ?? null,
        };
      }),
      page,
      hasMore,
    };
  } catch (error) {
    log.warn("Moderation comment list skipped", { err: error });
    return empty;
  }
}
