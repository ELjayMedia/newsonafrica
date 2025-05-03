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
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          title?: string
          slug?: string
          featuredImage?: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          title?: string
          slug?: string
          featuredImage?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          title?: string
          slug?: string
          featuredImage?: Json
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
          created_at?: string
          status?: string
          reported_by?: string | null
          report_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
