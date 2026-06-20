export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_write_events: {
        Row: { id: string; user_id: string | null; action: string; key: string | null; occurred_at: string }
        Insert: { id?: string; user_id?: string | null; action: string; key?: string | null; occurred_at?: string }
        Update: { id?: string; user_id?: string | null; action?: string; key?: string | null; occurred_at?: string }
        Relationships: []
      }
      auth_blocked_passwords: {
        Row: { id: string; password_hash: string; reason: string | null; created_at: string }
        Insert: { id?: string; password_hash: string; reason?: string | null; created_at?: string }
        Update: { id?: string; password_hash?: string; reason?: string | null; created_at?: string }
        Relationships: []
      }
      bookmark_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
          slug: string | null
          sort_index: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          slug?: string | null
          sort_index?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          slug?: string | null
          sort_index?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }
      bookmark_user_counters: {
        Row: {
          user_id: string
          total_count: number
          unread_count: number
          updated_at: string
          read_count: number | null
          collections_count: number | null
          collection_unread_counts: Json | null
        }
        Insert: {
          user_id: string
          total_count?: number
          unread_count?: number
          updated_at?: string
          read_count?: number | null
          collections_count?: number | null
          collection_unread_counts?: Json | null
        }
        Update: {
          user_id?: string
          total_count?: number
          unread_count?: number
          updated_at?: string
          read_count?: number | null
          collections_count?: number | null
          collection_unread_counts?: Json | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          wp_post_id: number
          edition_code: string
          collection_id: string | null
          read_state: Database["public"]["Enums"]["read_status"]
          read_at: string | null
          note: string | null
          created_at: string
          updated_at: string
          title: string | null
          slug: string | null
          excerpt: string | null
          featured_image: Json | null
          category: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          wp_post_id: number
          edition_code: string
          collection_id?: string | null
          read_state?: Database["public"]["Enums"]["read_status"]
          read_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
          title?: string | null
          slug?: string | null
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          wp_post_id?: number
          edition_code?: string
          collection_id?: string | null
          read_state?: Database["public"]["Enums"]["read_status"]
          read_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
          title?: string | null
          slug?: string | null
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      comment_post_counters: {
        Row: { wp_post_id: number; edition_code: string; total_approved: number; total_pending: number; total_hidden: number; updated_at: string }
        Insert: { wp_post_id: number; edition_code: string; total_approved?: number; total_pending?: number; total_hidden?: number; updated_at?: string }
        Update: { wp_post_id?: number; edition_code?: string; total_approved?: number; total_pending?: number; total_hidden?: number; updated_at?: string }
        Relationships: []
      }
      comment_reactions: {
        Row: { id: string; comment_id: string; user_id: string; reaction_type: string; created_at: string }
        Insert: { id?: string; comment_id: string; user_id: string; reaction_type?: string; created_at?: string }
        Update: { id?: string; comment_id?: string; user_id?: string; reaction_type?: string; created_at?: string }
        Relationships: []
      }
      comment_reports: {
        Row: { id: string; comment_id: string; reporter_id: string; reason: string | null; created_at: string }
        Insert: { id?: string; comment_id: string; reporter_id: string; reason?: string | null; created_at?: string }
        Update: { id?: string; comment_id?: string; reporter_id?: string; reason?: string | null; created_at?: string }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          wp_post_id: number
          edition_code: string
          user_id: string
          parent_id: string | null
          body: string
          status: Database["public"]["Enums"]["comment_status"]
          reactions_count: number
          replies_count: number
          edited_at: string | null
          created_at: string
          updated_at: string
          reported_by: string | null
          report_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          is_rich_text: boolean | null
        }
        Insert: {
          id?: string
          wp_post_id: number
          edition_code: string
          user_id: string
          parent_id?: string | null
          body: string
          status?: Database["public"]["Enums"]["comment_status"]
          reactions_count?: number
          replies_count?: number
          edited_at?: string | null
          created_at?: string
          updated_at?: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          is_rich_text?: boolean | null
        }
        Update: {
          id?: string
          wp_post_id?: number
          edition_code?: string
          user_id?: string
          parent_id?: string | null
          body?: string
          status?: Database["public"]["Enums"]["comment_status"]
          reactions_count?: number
          replies_count?: number
          edited_at?: string | null
          created_at?: string
          updated_at?: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          is_rich_text?: boolean | null
        }
        Relationships: []
      }
      content_index: {
        Row: {
          id: string
          edition_code: string
          wp_post_id: number
          slug: string
          title: string
          excerpt: string | null
          content_plain: string | null
          tags: string[] | null
          categories: string[] | null
          author: string | null
          published_at: string
          updated_at: string
          url_path: string
          featured_image_url: string | null
          search_vector: unknown
        }
        Insert: {
          id?: string
          edition_code: string
          wp_post_id: number
          slug: string
          title: string
          excerpt?: string | null
          content_plain?: string | null
          tags?: string[] | null
          categories?: string[] | null
          author?: string | null
          published_at: string
          updated_at?: string
          url_path: string
          featured_image_url?: string | null
          search_vector?: unknown
        }
        Update: {
          id?: string
          edition_code?: string
          wp_post_id?: number
          slug?: string
          title?: string
          excerpt?: string | null
          content_plain?: string | null
          tags?: string[] | null
          categories?: string[] | null
          author?: string | null
          published_at?: string
          updated_at?: string
          url_path?: string
          featured_image_url?: string | null
          search_vector?: unknown
        }
        Relationships: []
      }
      content_sync_cursor: {
        Row: { edition_code: string; last_synced_at: string; last_wp_post_id: number | null; sync_status: string; error_message: string | null; updated_at: string }
        Insert: { edition_code: string; last_synced_at?: string; last_wp_post_id?: number | null; sync_status?: string; error_message?: string | null; updated_at?: string }
        Update: { edition_code?: string; last_synced_at?: string; last_wp_post_id?: number | null; sync_status?: string; error_message?: string | null; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          username: string | null
          handle: string | null
          email: string | null
          website: string | null
          bio: string | null
          country: string | null
          location: string | null
          interests: string[] | null
          preferences: Json | null
          is_admin: boolean | null
          onboarded: boolean | null
          role: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          username?: string | null
          handle?: string | null
          email?: string | null
          website?: string | null
          bio?: string | null
          country?: string | null
          location?: string | null
          interests?: string[] | null
          preferences?: Json | null
          is_admin?: boolean | null
          onboarded?: boolean | null
          role?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          username?: string | null
          handle?: string | null
          email?: string | null
          website?: string | null
          bio?: string | null
          country?: string | null
          location?: string | null
          interests?: string[] | null
          preferences?: Json | null
          is_admin?: boolean | null
          onboarded?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: { id: string; user_id: string; plan: string; status: string; start_date: string; end_date: string | null; renewal_date: string | null; payment_provider: string; payment_id: string; metadata: Json | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; plan: string; status?: string; start_date?: string; end_date?: string | null; renewal_date?: string | null; payment_provider?: string; payment_id: string; metadata?: Json | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; plan?: string; status?: string; start_date?: string; end_date?: string | null; renewal_date?: string | null; payment_provider?: string; payment_id?: string; metadata?: Json | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      user_preferences: {
        Row: { user_id: string; theme: string | null; language: string | null; email_notifications: boolean | null; push_notifications: boolean | null; sections: string[] | null; blocked_topics: string[] | null; countries: string[] | null; created_at: string | null; updated_at: string | null }
        Insert: { user_id: string; theme?: string | null; language?: string | null; email_notifications?: boolean | null; push_notifications?: boolean | null; sections?: string[] | null; blocked_topics?: string[] | null; countries?: string[] | null; created_at?: string | null; updated_at?: string | null }
        Update: { user_id?: string; theme?: string | null; language?: string | null; email_notifications?: boolean | null; push_notifications?: boolean | null; sections?: string[] | null; blocked_topics?: string[] | null; countries?: string[] | null; created_at?: string | null; updated_at?: string | null }
        Relationships: []
      }
      user_settings: {
        Row: { user_id: string; email_notifications: boolean | null; push_notifications: boolean | null; theme: string | null; language: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; email_notifications?: boolean | null; push_notifications?: boolean | null; theme?: string | null; language?: string | null; created_at?: string; updated_at?: string }
        Update: { user_id?: string; email_notifications?: boolean | null; push_notifications?: boolean | null; theme?: string | null; language?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      wp_posts_cache: {
        Row: { edition_code: string; wp_post_id: number; slug: string; title: string; excerpt: string | null; hero_image_url: string | null; published_at: string | null; last_synced_at: string }
        Insert: { edition_code: string; wp_post_id: number; slug: string; title: string; excerpt?: string | null; hero_image_url?: string | null; published_at?: string | null; last_synced_at?: string }
        Update: { edition_code?: string; wp_post_id?: number; slug?: string; title?: string; excerpt?: string | null; hero_image_url?: string | null; published_at?: string | null; last_synced_at?: string }
        Relationships: []
      }
    }
    Views: {
      comments_view: {
        Row: Database["public"]["Tables"]["comments"]["Row"]
        Insert: Database["public"]["Tables"]["comments"]["Insert"]
        Update: Database["public"]["Tables"]["comments"]["Update"]
        Relationships: []
      }
    }
    Functions: {
      search_content: {
        Args: { search_query: string; edition_filter?: string; category_filter?: string; limit_count?: number; offset_count?: number }
        Returns: Array<{
          id: string
          wp_post_id: number
          edition_code: string
          slug: string
          title: string
          excerpt: string
          url_path: string
          featured_image_url: string
          categories: string[]
          tags: string[]
          author: string
          published_at: string
          rank: number
        }>
      }
      search_suggestions: {
        Args: { search_query: string; edition_filter?: string; limit_count?: number }
        Returns: Array<{ title: string; slug: string; edition_code: string; url_path: string }>
      }
      get_bookmark_stats: { Args: { user_uuid: string }; Returns: Json }
      handle_bookmark: { Args: Record<string, unknown>; Returns: Json | undefined }
      bookmarks_can_insert: { Args: { p_user_id: string }; Returns: boolean }
      bookmarks_can_update: { Args: { b_id?: string; p_bookmark_id?: string; p_user_id?: string }; Returns: boolean }
      bookmarks_can_delete: { Args: { b_id: string }; Returns: boolean }
    }
    Enums: {
      comment_status: "active" | "flagged" | "hidden" | "deleted" | "pending" | "approved" | "spam"
      read_status: "unread" | "in_progress" | "read"
      bookmark_read_status: "read" | "unread" | "archived"
      reaction_type: "like" | "love" | "laugh" | "wow" | "sad" | "angry"
      app_role: "attendee" | "organizer_staff" | "organizer_admin" | "scanner" | "device"
      billing_interval: "day" | "week" | "month" | "year"
      currency_code: "SZL" | "USD" | "NGN" | "ZAR"
      event_status: "draft" | "published" | "archived"
      fee_payer: "buyer" | "organizer"
      notification_type: "info" | "warning" | "success" | "error"
      order_status: "pending" | "paid" | "cancelled" | "refunded"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      payments_status: "pending" | "succeeded" | "failed"
      payout_status: "requested" | "processing" | "paid" | "failed"
      refund_status: "requested" | "processing" | "succeeded" | "failed"
      refund_type: "full" | "partial"
      sales_channel: "online" | "pos" | "box_office" | "internal"
      seat_hold_status: "active" | "expired" | "released"
      subscription_plan: "free" | "pro" | "business"
      subscription_status: "active" | "trialing" | "canceled" | "past_due" | "unpaid"
      transfer_status: "requested" | "listed" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      comment_status: ["active", "flagged", "hidden", "deleted", "pending", "approved", "spam"],
      read_status: ["unread", "in_progress", "read"],
    },
  },
} as const
