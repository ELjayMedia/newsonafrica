export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          country: string | null
          title: string | null
          slug: string | null
          excerpt: string | null
          featured_image: Json | null
          category: string | null
          tags: string[] | null
          read_status: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          country?: string | null
          title?: string | null
          slug?: string | null
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
          read_status?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          country?: string | null
          title?: string | null
          slug?: string | null
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
          read_status?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_id: string | null
          country: string | null
          status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reaction_count: number
          is_rich_text: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_id?: string | null
          country?: string | null
          status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reaction_count?: number
          is_rich_text?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          country?: string | null
          status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reaction_count?: number
          is_rich_text?: boolean
          created_at?: string
        }
        Relationships: []
      }
      comment_reports: {
        Row: {
          id: string
          comment_id: string
          reported_by: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          reported_by: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          reported_by?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string
          handle: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          email: string | null
          bio: string | null
          country: string | null
          location: string | null
          interests: string[] | null
          preferences: Json | null
          updated_at: string | null
          created_at: string
          is_admin: boolean | null
          onboarded: boolean | null
          role: string | null
        }
        Insert: {
          id: string
          username: string
          handle?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          bio?: string | null
          country?: string | null
          location?: string | null
          interests?: string[] | null
          preferences?: Json | null
          updated_at?: string | null
          created_at?: string
          is_admin?: boolean | null
          onboarded?: boolean | null
          role?: string | null
        }
        Update: {
          id?: string
          username?: string
          handle?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          bio?: string | null
          country?: string | null
          location?: string | null
          interests?: string[] | null
          preferences?: Json | null
          updated_at?: string | null
          created_at?: string
          is_admin?: boolean | null
          onboarded?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
      schema_versions: {
        Row: {
          id: number
          version: string
          applied_at: string
          applied_by: string
          description: string
          status: string
          script: string | null
        }
        Insert: {
          id?: number
          version: string
          applied_at?: string
          applied_by: string
          description: string
          status?: string
          script?: string | null
        }
        Update: {
          id?: number
          version?: string
          applied_at?: string
          applied_by?: string
          description?: string
          status?: string
          script?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: string
          status: string
          start_date: string
          end_date: string | null
          renewal_date: string | null
          payment_provider: string
          payment_id: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          status: string
          start_date: string
          end_date?: string | null
          renewal_date?: string | null
          payment_provider: string
          payment_id: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          status?: string
          start_date?: string
          end_date?: string | null
          renewal_date?: string | null
          payment_provider?: string
          payment_id?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          amount: number
          status: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          id: string
          amount: number
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          amount: number
          status: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string
          sections: string[] | null
          blocked_topics: string[] | null
          countries: string[] | null
        }
        Insert: {
          user_id: string
          sections?: string[] | null
          blocked_topics?: string[] | null
          countries?: string[] | null
        }
        Update: {
          user_id?: string
          sections?: string[] | null
          blocked_topics?: string[] | null
          countries?: string[] | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          email_notifications: boolean
          push_notifications: boolean
          theme: string
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          email_notifications?: boolean
          push_notifications?: boolean
          theme?: string
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          theme?: string
          language?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
