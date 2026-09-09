/**
 * Hand-written Supabase types for the active application schema.
 *
 * Keep this file aligned with the live project whenever new migrations add
 * tables/RPCs. The September 2026 additions below were reconciled against
 * `supabase gen types typescript` output from the production project.
 *
 * NOTE: these must be `type` aliases, not `interface`s. supabase-js's
 * `SupabaseClient<Database>` generic only resolves table types when each
 * Row/Insert/Update structurally satisfies `Record<string, unknown>`.
 */

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

export type ContentIndexHealthRow = {
  edition_code: string;
  rows: number;
  missing_vector: number;
  pct_tags: number;
  pct_categories: number;
  pct_content: number;
  oldest: string;
  newest: string;
  sync_status: string;
  last_synced_at: string;
  error_message: string;
};

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
  total_count: number;
};

export type SearchSuggestionRow = {
  title: string;
  edition_code: string;
  slug: string;
  url_path: string;
};

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

export type ReadStatus = "unread" | "in_progress" | "read";

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

export type CommentStatus =
  "active" | "flagged" | "hidden" | "deleted" | "pending" | "approved" | "spam";

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
>;

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

export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed";

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  status: NewsletterStatus;
  edition_code: string | null;
  source_vertical: string | null;
  source_campaign: string | null;
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

export type PressCredentialStatus = "active" | "expired" | "suspended" | "revoked" | "lost" | "stolen";
export type PressCredentialRole =
  | "journalist"
  | "editor"
  | "photographer"
  | "videographer"
  | "freelancer"
  | "contributor";

export type PressCredentialRow = {
  id: string;
  credential_number: string;
  holder_name: string;
  holder_email: string | null;
  holder_phone: string | null;
  role: string;
  department: string | null;
  photo_url: string | null;
  id_card_url: string | null;
  issue_date: string;
  expiry_date: string;
  status: string;
  verifying_editor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PressCredentialInsert = Pick<PressCredentialRow, "holder_name" | "role" | "expiry_date"> &
  Partial<Omit<PressCredentialRow, "holder_name" | "role" | "expiry_date">>;

export type CredentialVerificationRow = {
  id: string;
  credential_id: string | null;
  verified_at: string;
  verified_by: string | null;
  verification_method: string | null;
  ip_address: unknown;
  result: string;
};

export type CredentialVerificationInsert = Pick<CredentialVerificationRow, "result"> &
  Partial<Omit<CredentialVerificationRow, "result">>;

export type CrewMemberRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  skills: string[] | null;
  availability: string | null;
  credential_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CrewMemberInsert = Pick<CrewMemberRow, "full_name" | "role"> &
  Partial<Omit<CrewMemberRow, "full_name" | "role">>;

export type EquipmentRow = {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  assigned_to: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentInsert = Pick<EquipmentRow, "asset_tag" | "name" | "category"> &
  Partial<Omit<EquipmentRow, "asset_tag" | "name" | "category">>;

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string | null;
  renewal_date: string | null;
  payment_provider: string;
  payment_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionInsert = Pick<SubscriptionRow, "user_id" | "plan" | "payment_id"> &
  Partial<Omit<SubscriptionRow, "user_id" | "plan" | "payment_id">>;

export type AdEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  placement_type: string;
  campaign_id: string | null;
  sponsor_name: string | null;
  edition_code: string;
  vertical: string | null;
  country: string;
  article_id: number | null;
  session_id: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  metadata: Record<string, unknown> | null;
};

export type AdEventInsert = Pick<AdEventRow, "event_type" | "placement_type" | "edition_code" | "country"> &
  Partial<Omit<AdEventRow, "event_type" | "placement_type" | "edition_code" | "country">>;

export type WebhookEventRow = {
  id: string;
  source: string;
  payload_hash: string;
  created_at: string;
};

export type WebhookEventInsert = Pick<WebhookEventRow, "payload_hash"> &
  Partial<Omit<WebhookEventRow, "payload_hash">>;

export type CampaignSummaryRow = {
  campaign_id: string | null;
  sponsor_name: string | null;
  edition_code: string | null;
  placement_type: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr_percent: number | null;
  first_event_at: string | null;
  last_event_at: string | null;
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
      press_credentials: {
        Row: PressCredentialRow;
        Insert: PressCredentialInsert;
        Update: Partial<PressCredentialInsert>;
        Relationships: [];
      };
      credential_verifications: {
        Row: CredentialVerificationRow;
        Insert: CredentialVerificationInsert;
        Update: Partial<CredentialVerificationInsert>;
        Relationships: [];
      };
      crew_members: {
        Row: CrewMemberRow;
        Insert: CrewMemberInsert;
        Update: Partial<CrewMemberInsert>;
        Relationships: [];
      };
      equipment: {
        Row: EquipmentRow;
        Insert: EquipmentInsert;
        Update: Partial<EquipmentInsert>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: Partial<SubscriptionInsert>;
        Relationships: [];
      };
      ad_events: {
        Row: AdEventRow;
        Insert: AdEventInsert;
        Update: Partial<AdEventInsert>;
        Relationships: [];
      };
      webhook_events: {
        Row: WebhookEventRow;
        Insert: WebhookEventInsert;
        Update: Partial<WebhookEventInsert>;
        Relationships: [];
      };
    };
    Views: {
      campaign_summary: {
        Row: CampaignSummaryRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
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
      content_index_health_report: {
        Args: Record<string, never>;
        Returns: ContentIndexHealthRow[];
      };
      user_has_active_subscription: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      get_active_subscription: {
        Args: { p_user_id: string };
        Returns: SubscriptionRow[];
      };
      log_ad_event: {
        Args: {
          p_event_type: string;
          p_placement_type: string;
          p_edition_code: string;
          p_country: string;
          p_campaign_id?: string | null;
          p_sponsor_name?: string | null;
          p_vertical?: string | null;
          p_article_id?: number | null;
          p_session_id?: string | null;
          p_metadata?: Record<string, unknown> | null;
        };
        Returns: string;
      };
      refresh_campaign_summary: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
};
