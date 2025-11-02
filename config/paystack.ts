import { SUBSCRIPTION_PLANS as BASE_SUBSCRIPTION_PLANS, type PaystackSubscriptionPlan } from "@/supabase/functions/_shared/paystack"

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

export type SubscriptionStatus = "active" | "cancelled" | "past_due"

export interface SupabaseSubscription {
  user_id: string
  plan: string
  status: SubscriptionStatus
  renewal_date: string | null
  payment_id: string
}

export type SubscriptionPlan = PaystackSubscriptionPlan

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = BASE_SUBSCRIPTION_PLANS
