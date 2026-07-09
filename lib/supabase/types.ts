/**
 * Hand-written types for the tables/functions this phase introduces
 * (`supabase/migrations/20260702120000_content_index.sql`). Narrow by
 * design — extend as more Supabase-backed features land, or replace with
 * `supabase gen types typescript` output once the schema stabilizes.
 *
 * NOTE: these must be `type` aliases, not `interface`s. supabase-js's
 * `SupabaseClient<Database>` generic only resolves table types when each
 * Row/Insert/Update structurally satisfies `Record<string, unknown>`, which
 * plain interfaces (lacking an index signature) fail — silently collapsing
 * every `.from(...)` call to `never`.
 */

// Matches the live `content_index` schema (NOA-87): the edition is keyed by
// `edition_code` (not `country`), and the live table has no `status`/`view_count`
// columns — only published content is indexed, and view counts aren't tracked here.
export type ContentIndexRow = {
  id: string;
  wp_post_id: number;
  edition_code: string;
  slug: string;
  url_path: string;
  title: string;
  excerpt: string | null;
  content_plain: string | null;
  author: string | null;
  categories: string[];
  tags: string[];
  featured_image_url: string | null;
  published_at: string;
  updated_at: string;
  search_vector: unknown;
};

export type ContentIndexInsert = Omit<
  ContentIndexRow,
  "id" | "updated_at" | "search_vector" | "categories" | "tags" | "excerpt" | "content_plain" | "author" | "featured_image_url"
> &
  Partial<
    Pick<
      ContentIndexRow,
      "categories" | "tags" | "excerpt" | "content_plain" | "author" | "featured_image_url"
    >
  >;

export type ContentSyncStatus = "idle" | "running" | "completed" | "failed";

export type ContentSyncCursorRow = {
  edition_code: string;
  last_synced_at: string;
  last_wp_post_id: number | null;
  sync_status: ContentSyncStatus;
  error_message: string | null;
  updated_at: string;
};

export type SearchContentRow = {
  id: string;
  country: string;
  wp_post_id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  categories: string[];
  author: string | null;
  published_at: string;
  url_path: string;
  featured_image_url: string | null;
  rank: number;
  /** Window count of ALL rows matching the query/filters (same on every row) — added by 20260702150000_search_pagination.sql for pagination. */
  total_count: number;
};

export type SearchSuggestionRow = {
  title: string;
  country: string;
  slug: string;
  url_path: string;
};

/** Reader profile row (NOA-99, `supabase/migrations/20260703100000_profiles.sql`). */
export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_country: string | null;
  /** Moderation gate (NOA-102) — set via SQL/service role only. */
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Pick<ProfileRow, "id"> &
  Partial<Pick<ProfileRow, "display_name" | "avatar_url" | "preferred_country">>;

export type ProfileUpdate = Partial<
  Pick<ProfileRow, "display_name" | "avatar_url" | "preferred_country">
>;

/** Saved article (NOA-100, `supabase/migrations/20260703110000_bookmarks.sql`). */
export type BookmarkRow = {
  id: string;
  user_id: string;
  country: string;
  wp_post_id: number;
  slug: string;
  created_at: string;
};

export type BookmarkInsert = Pick<BookmarkRow, "user_id" | "country" | "wp_post_id" | "slug"> &
  Partial<Pick<BookmarkRow, "id" | "created_at">>;

/** Moderation states (NOA-101, `supabase/migrations/20260703112000_comments.sql`). */
export type CommentStatus = "pending" | "approved" | "hidden" | "deleted";

/** Article comment (NOA-101). `root_id` is set by a DB trigger on insert. */
export type CommentRow = {
  id: string;
  country: string;
  wp_post_id: number;
  user_id: string;
  parent_id: string | null;
  root_id: string | null;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type CommentInsert = Pick<CommentRow, "country" | "wp_post_id" | "user_id" | "body"> &
  Partial<Pick<CommentRow, "id" | "parent_id" | "status">>;

export type CommentUpdate = Partial<Pick<CommentRow, "body" | "status" | "edited_at">>;

export type MostReadRow = {
  id: string;
  country: string;
  wp_post_id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  url_path: string;
  featured_image_url: string | null;
  view_count: number;
  published_at: string;
};

export type Database = {
  public: {
    Tables: {
      content_index: {
        Row: ContentIndexRow;
        Insert: ContentIndexInsert;
        Update: Partial<ContentIndexInsert>;
        Relationships: [];
      };
      content_sync_cursor: {
        Row: ContentSyncCursorRow;
        Insert: Partial<ContentSyncCursorRow> & Pick<ContentSyncCursorRow, "edition_code">;
        Update: Partial<ContentSyncCursorRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      bookmarks: {
        Row: BookmarkRow;
        Insert: BookmarkInsert;
        Update: Partial<BookmarkInsert>;
        Relationships: [];
      };
      comments: {
        Row: CommentRow;
        Insert: CommentInsert;
        Update: CommentUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_content: {
        Args: {
          search_query: string;
          country_filter?: string | null;
          category_filter?: string | null;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: SearchContentRow[];
      };
      search_suggestions: {
        Args: {
          search_query: string;
          country_filter?: string | null;
          limit_count?: number;
        };
        Returns: SearchSuggestionRow[];
      };
      most_read_content: {
        Args: {
          country_filter: string;
          limit_count?: number;
        };
        Returns: MostReadRow[];
      };
    };
  };
};
