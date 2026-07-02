/**
 * Map a normalized DAL `Post` (NOA-86) into a `content_index` row (NOA-87).
 * Pure function — no network/database access — so it's independently
 * testable from the sync routine that calls it.
 */
import { stripHtml } from "@/lib/wordpress/html";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import type { Post } from "@/lib/dal/types";
import type { ContentIndexInsert } from "@/lib/supabase/types";

/** Cap stored plain-text content so index rows stay small; full content lives in WordPress. */
const MAX_CONTENT_PLAIN_LENGTH = 5000;

export function mapPostToContentIndexRow(post: Post): ContentIndexInsert {
  return {
    wp_post_id: post.id,
    country: post.country,
    slug: post.slug,
    url_path: getArticleUrl(post.country, post.slug),
    status: post.status,
    title: post.title,
    excerpt: post.excerpt || null,
    content_plain: stripHtml(post.content).slice(0, MAX_CONTENT_PLAIN_LENGTH) || null,
    author: post.author?.name ?? null,
    categories: post.categories.map((c) => c.name),
    tags: post.tags.map((t) => t.name),
    featured_image_url: post.featuredImage?.url ?? null,
    published_at: post.publishedAt,
  };
}
