export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          website: string | null
          email: string | null
          bio: string | null
          country: string | null
          interests: string[] | null
          updated_at: string | null
          created_at: string
          is_admin: boolean | null
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          bio?: string | null
          country?: string | null
          interests?: string[] | null
          updated_at?: string | null
          created_at?: string
          is_admin?: boolean | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          bio?: string | null
          country?: string | null
          interests?: string[] | null
          updated_at?: string | null
          created_at?: string
          is_admin?: boolean | null
        }
      }
      bookmarks: {
        Row: {
          id: string
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
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_id: string | null
          country?: string | null
          created_at: string
          status: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_id?: string | null
          country?: string | null
          created_at?: string
          status?: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          country?: string | null
          created_at?: string
          status?: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
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
          status: string
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
