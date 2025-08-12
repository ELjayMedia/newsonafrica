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
          email: string | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
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
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
          read_status?: 'read' | 'unread' | null
          notes?: string | null
          created_at: string
          collection_id?: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          title?: string
          slug?: string
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
          read_status?: 'read' | 'unread' | null
          notes?: string | null
          created_at?: string
          collection_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          featured_image?: Json | null
          category?: string | null
          tags?: string[] | null
          read_status?: 'read' | 'unread' | null
          notes?: string | null
          created_at?: string
          collection_id?: string | null
        }
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
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
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
      comment_reactions: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'sad' | 'angry'
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'sad' | 'angry'
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          reaction_type?: 'like' | 'love' | 'laugh' | 'sad' | 'angry'
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          link?: string | null
          read?: boolean
          created_at?: string
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
          payment_provider?: string
          payment_id?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string | null
          type: string
          reference: string
          amount: number
          currency: string
          status: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          reference: string
          amount: number
          currency: string
          status: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          reference?: string
          amount?: number
          currency?: string
          status?: string
          description?: string | null
          created_at?: string
        }
      }
      article_gifts: {
        Row: {
          id: string
          user_id: string | null
          article_id: string
          recipient_email: string
          reference: string
          amount: number
          currency: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          article_id: string
          recipient_email: string
          reference: string
          amount: number
          currency: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          article_id?: string
          recipient_email?: string
          reference?: string
          amount?: number
          currency?: string
          status?: string
          created_at?: string
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
