/**
 * Normalized domain types returned by the data access layer (NOA-86).
 *
 * Application code (pages, components, the Reading/Search phases) should
 * depend on these — not on the raw WordPress REST/GraphQL shapes in
 * `@/lib/wordpress/types` — so the WordPress integration can evolve without
 * rippling through the app.
 */
import type { CountryCode } from "@/lib/wordpress/countries";

export interface PostImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface TagSummary {
  id: number;
  name: string;
  slug: string;
}

export interface AuthorSummary {
  id: number;
  name: string;
  slug: string;
  avatarUrl?: string;
}

/**
 * A dated correction or post-publication update note surfaced on the article
 * (NOA-139). Populated from a WordPress custom field once exposed via WPGraphQL;
 * absent until then, so the field is optional.
 */
export interface CorrectionEntry {
  /** ISO date the correction/update was made. */
  date: string;
  /** Reader-facing note, e.g. "An earlier version misstated the date." */
  note: string;
  /** A factual correction vs a substantive update to a developing story. */
  kind: "correction" | "update";
}

export interface SponsorInfo {
  isSponsored: boolean;
  sponsorName: string;
  sponsorTier?: string;
  disclosureLabel: string;
  campaignId?: string;
  /** Optional advertiser CTA; rendered only for http(s) destinations. */
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface Post {
  /** WordPress post ID (`wp_post_id` in the content index). */
  id: number;
  slug: string;
  country: CountryCode;
  title: string;
  excerpt: string;
  /** Sanitized rendered HTML — safe to dangerouslySetInnerHTML on the article page. */
  content: string;
  status: string;
  publishedAt: string;
  updatedAt: string;
  featuredImage: PostImage | null;
  categories: CategorySummary[];
  tags: TagSummary[];
  author: AuthorSummary | null;
  /** Dated correction/update notes, newest first (NOA-139). */
  corrections?: CorrectionEntry[];
  /** Sponsor metadata (NOA-141). */
  sponsor?: SponsorInfo;
}

/** Lightweight post shape for listing surfaces (home feed, category feed, most-read). */
export type PostSummary = Omit<Post, "content">;

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

export interface Author {
  id: number;
  name: string;
  slug: string;
  bio: string;
  avatarUrl?: string;
}

export interface Country {
  code: CountryCode;
  name: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PostListParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
  search?: string;
}

/** A most-read entry (Supabase `most_read_content` RPC, NOA-89/NOA-87). */
export interface MostReadPost {
  id: string;
  wpPostId: number;
  slug: string;
  country: CountryCode;
  title: string;
  excerpt: string;
  url: string;
  featuredImageUrl: string | null;
  publishedAt: string;
}
