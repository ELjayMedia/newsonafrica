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
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          content: string
          related_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          content: string
          related_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          content?: string
          related_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          slug: string
          name: string
          paystack_plan_id: string
          price: number
          interval: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          paystack_plan_id: string
          price: number
          interval: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          paystack_plan_id?: string
          price?: number
          interval?: string
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          plan_name: string
          provider: string
          provider_subscription_id: string | null
          provider_email_token: string | null
          paystack_customer_id: string | null
          paystack_authorization_code: string | null
          status: string
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          plan_name: string
          provider?: string
          provider_subscription_id?: string | null
          provider_email_token?: string | null
          paystack_customer_id?: string | null
          paystack_authorization_code?: string | null
          status: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          plan_name?: string
          provider?: string
          provider_subscription_id?: string | null
          provider_email_token?: string | null
          paystack_customer_id?: string | null
          paystack_authorization_code?: string | null
          status?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          subscription_id: string
          paystack_charge_id: string | null
          amount: number
          currency: string
          status: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          paystack_charge_id?: string | null
          amount: number
          currency: string
          status: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          paystack_charge_id?: string | null
          amount?: number
          currency?: string
          status?: string
          paid_at?: string | null
          created_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: number
          event_type: string
          payload: Json
          received_at: string
        }
        Insert: {
          id?: number
          event_type: string
          payload: Json
          received_at?: string
        }
        Update: {
          id?: number
          event_type?: string
          payload?: Json
          received_at?: string
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
