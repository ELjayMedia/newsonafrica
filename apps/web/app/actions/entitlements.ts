"use server"

import { withSupabaseSession } from "@/app/actions/supabase"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { checkUserEntitlement, validateContentAccess, isArticlePremium } from "@/lib/entitlements"
import type { EntitlementCheck } from "@/lib/entitlements"

export async function checkMyEntitlement(): Promise<ActionResult<EntitlementCheck>> {
  return withSupabaseSession(async ({ session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    return checkUserEntitlement(session.user.id)
  })
}

export async function checkArticleAccess(article: {
  tags?: Array<{ name: string }> | string[]
  categories?: Array<{ name: string }> | string[]
}): Promise<ActionResult<EntitlementCheck>> {
  return withSupabaseSession(async ({ session }) => {
    const userId = session?.user?.id ?? null
    return validateContentAccess(userId, article)
  })
}

export async function checkIfArticlePremium(article: {
  tags?: Array<{ name: string }> | string[]
  categories?: Array<{ name: string }> | string[]
}): Promise<ActionResult<boolean>> {
  return withSupabaseSession(async () => {
    return isArticlePremium(article)
  })
}
