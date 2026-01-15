import { createServerClient } from "@/lib/supabase/server"
import { cachedFetch, CACHE_TIMEOUTS, buildTags } from "@/lib/server/unified-cache"
import type { Database } from "@/types/supabase"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]

export interface EntitlementCheck {
  hasAccess: boolean
  subscription: SubscriptionRow | null
  reason?: string
}

/**
 * Check if a user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const check = await checkUserEntitlement(userId)
  return check.hasAccess
}

/**
 * Get user's active subscription if any
 */
export async function getUserActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createServerClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching subscription:", error)
      return null
    }

    // Verify subscription is not expired
    if (data && data.renewal_date) {
      const renewalDate = new Date(data.renewal_date)
      if (renewalDate < new Date()) {
        console.log("[v0] Subscription expired:", data.id)
        return null
      }
    }

    return data
  } catch (error) {
    console.error("[v0] Subscription check failed:", error)
    return null
  }
}

/**
 * Check user entitlement with caching
 */
export async function checkUserEntitlement(userId: string): Promise<EntitlementCheck> {
  return cachedFetch(
    `entitlement:${userId}`,
    async () => {
      const subscription = await getUserActiveSubscription(userId)

      if (!subscription) {
        return {
          hasAccess: false,
          subscription: null,
          reason: "No active subscription",
        }
      }

      // Additional validation
      if (subscription.status !== "active") {
        return {
          hasAccess: false,
          subscription,
          reason: `Subscription status is ${subscription.status}`,
        }
      }

      return {
        hasAccess: true,
        subscription,
      }
    },
    {
      tags: buildTags("USER", [userId]),
      revalidate: CACHE_TIMEOUTS.SHORT, // 1 minute cache
    },
  )
}

/**
 * Check if article requires premium access
 * Articles with "premium" tag or category require subscription
 */
export function isArticlePremium(article: {
  tags?: Array<{ name: string }> | string[]
  categories?: Array<{ name: string }> | string[]
}): boolean {
  // Check tags
  const tags = article.tags || []
  const hasPremiumTag = tags.some((tag) => {
    if (typeof tag === "string") {
      return tag.toLowerCase() === "premium" || tag.toLowerCase() === "subscriber"
    }
    return tag.name.toLowerCase() === "premium" || tag.name.toLowerCase() === "subscriber"
  })

  if (hasPremiumTag) return true

  // Check categories
  const categories = article.categories || []
  const hasPremiumCategory = categories.some((cat) => {
    if (typeof cat === "string") {
      return cat.toLowerCase() === "premium" || cat.toLowerCase() === "subscribers only"
    }
    return cat.name.toLowerCase() === "premium" || cat.name.toLowerCase() === "subscribers only"
  })

  return hasPremiumCategory
}

/**
 * Validate access to premium content
 */
export async function validateContentAccess(
  userId: string | null,
  article: {
    tags?: Array<{ name: string }> | string[]
    categories?: Array<{ name: string }> | string[]
  },
): Promise<EntitlementCheck> {
  const isPremium = isArticlePremium(article)

  // If content is not premium, grant access
  if (!isPremium) {
    return {
      hasAccess: true,
      subscription: null,
      reason: "Content is freely accessible",
    }
  }

  // Premium content requires authentication
  if (!userId) {
    return {
      hasAccess: false,
      subscription: null,
      reason: "Premium content requires authentication",
    }
  }

  // Check user's subscription status
  return checkUserEntitlement(userId)
}
