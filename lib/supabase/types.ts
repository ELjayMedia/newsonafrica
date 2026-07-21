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
  | "id"
  | "updated_at"
  | "search_vector"
  | "categories"
  | "tags"
  | "excerpt"
  | "content_plain"
  | "author"
  | "featured_image_url"
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

// Matches the live `search_content` RPC return: keyed by `edition_code`, with a
// windowed `total_count` (same on every row) for exact pagination — restored by
// migration 20260710000000_search_content_total_count.sql.
export type SearchContentRow = {
  id: string;
  edition_code: string;
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
  /** Count of ALL rows matching the query/filters (same on every row). */
  total_count: number;
};

export type SearchSuggestionRow = {
  title: string;
  edition_code: string;
  slug: string;
  url_path: string;
};

// Reader profile row — matches the live `profiles` schema. The reader's name
// is stored in `full_name` (not `display_name`) and their edition preference in
// `country` (not `preferred_country`); several richer profile fields exist too.
export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  handle: string | null;
  email: string | null;
  website: string | null;
  bio: string | null;
  country: string | null;
  location: string | null;
  interests: string[] | null;
  preferences: Record<string, unknown> | null;
  /** Moderation gate (NOA-102) — set via SQL/service role only. */
  is_admin: boolean | null;
  onboarded: boolean | null;
  role: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Pick<ProfileRow, "id"> &
  Partial<Pick<ProfileRow, "full_name" | "avatar_url" | "country">>;

export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | "full_name"
    | "avatar_url"
    | "username"
    | "handle"
    | "email"
    | "website"
    | "bio"
    | "country"
    | "location"
    | "interests"
    | "preferences"
    | "onboarded"
    | "role"
  >
>;

/** Reading progress on a saved article (live `read_status` enum). */
export type ReadStatus = "unread" | "in_progress" | "read";

// Saved article — matches the live `bookmarks` schema: keyed by
// (user_id, wp_post_id, edition_code), with the article metadata snapshotted
// onto the row (title/slug/excerpt/featured_image/category/tags) plus reading
// state (read_state/read_at/note/collection_id).
export type BookmarkRow = {
  id: string;
  user_id: string;
  wp_post_id: number;
  edition_code: string;
  collection_id: string | null;
  read_state: ReadStatus;
  read_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  featured_image: Record<string, unknown> | null;
  category: string | null;
  tags: string[] | null;
};

export type BookmarkInsert = Pick<BookmarkRow, "user_id" | "wp_post_id" | "edition_code"> &
  Partial<
    Pick<
      BookmarkRow,
      | "id"
      | "slug"
      | "title"
      | "excerpt"
      | "category"
      | "tags"
      | "note"
      | "collection_id"
      | "read_state"
      | "created_at"
    >
  >;

/** Moderation states — the live `comment_status` enum. */
export type CommentStatus =
  "active" | "flagged" | "hidden" | "deleted" | "pending" | "approved" | "spam";

// Article comment — matches the live `comments` schema: keyed by edition_code,
// threaded purely by parent_id (no `root_id` column), with moderation/report
// metadata and engagement counters on the row.
export type CommentRow = {
  id: string;
  wp_post_id: number;
  edition_code: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  status: CommentStatus;
  reactions_count: number;
  replies_count: number;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  reported_by: string | null;
  report_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_rich_text: boolean | null;
};

export type CommentInsert = Pick<CommentRow, "edition_code" | "wp_post_id" | "user_id" | "body"> &
  Partial<Pick<CommentRow, "id" | "parent_id" | "status">>;

// `user_id` is nullable on update only: account deletion anonymises authored
// comments (user_id → null) so they detach from the profile before the
// auth-user delete cascades, keeping other readers' replies intact.
export type CommentUpdate = Partial<
  Pick<
    CommentRow,
    | "body"
    | "status"
    | "edited_at"
    | "reported_by"
    | "report_reason"
    | "reviewed_at"
    | "reviewed_by"
  >
> & { user_id?: string | null };

// Matches the live `most_read_content` RPC return: keyed by `edition_code`,
// ordered internally by the RPC (returns `rank`, not a `view_count` column).
export type MostReadRow = {
  id: string;
  edition_code: string;
  wp_post_id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  url_path: string;
  featured_image_url: string | null;
  published_at: string;
};

// Newsletter capture (NOA-129). First-party owned-audience storage; writes go
// through the service-role server action only (RLS locks out client access).
export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed";

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  status: NewsletterStatus;
  /** Edition the reader signed up from (`sz`/`za`/`ng`), or null for pan-African. */
  edition_code: string | null;
  /** Editorial/commercial vertical the capture point sits in (e.g. `business`). */
  source_vertical: string | null;
  /** Campaign tag for attribution (utm-style). */
  source_campaign: string | null;
  /** Where the sign-up happened (e.g. `footer`, `/sz`). */
  source_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
};

export type NewsletterSubscriberInsert = Pick<NewsletterSubscriberRow, "email"> &
  Partial<
    Pick<
      NewsletterSubscriberRow,
      "status" | "edition_code" | "source_vertical" | "source_campaign" | "source_path" | "metadata"
    >
  >;

// Search query logging (NOA-137). Written server-side (service role); no client
// access. Feeds top-queries / zero-result-rate reporting.
export type SearchQueryLogRow = {
  id: string;
  query: string;
  edition_code: string | null;
  result_count: number;
  user_id: string | null;
  created_at: string;
};

export type SearchQueryLogInsert = Pick<SearchQueryLogRow, "query"> &
  Partial<Pick<SearchQueryLogRow, "edition_code" | "result_count" | "user_id">>;

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
      newsletter_subscribers: {
        Row: NewsletterSubscriberRow;
        Insert: NewsletterSubscriberInsert;
        Update: Partial<NewsletterSubscriberInsert>;
        Relationships: [];
      };
      search_query_log: {
        Row: SearchQueryLogRow;
        Insert: SearchQueryLogInsert;
        Update: Partial<SearchQueryLogInsert>;
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
