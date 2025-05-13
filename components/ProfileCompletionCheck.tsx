"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/contexts/UserContext"

export function ProfileCompletionCheck({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAuthenticated } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Skip check if still loading, not authenticated, or already on the completion page
    if (loading || !isAuthenticated || pathname === "/profile/complete" || pathname === "/auth/callback" || checked) {
      return
    }

    // Check if profile needs completion
    const needsCompletion = isProfileIncomplete(profile)

    if (needsCompletion) {
      // Store the current path to redirect back after completion
      if (pathname !== "/profile/complete") {
        sessionStorage.setItem("redirectAfterProfileCompletion", pathname)
      }
      router.push("/profile/complete")
    }

    setChecked(true)
  }, [loading, isAuthenticated, profile, router, pathname, checked])

  return <>{children}</>
}

// Function to determine if a profile needs completion
function isProfileIncomplete(profile: any) {
  if (!profile) return true

  // Check for required fields
  if (!profile.username || profile.username.trim() === "") return true

  // Additional checks for optional but recommended fields
  // For social logins, we might want to ensure they have a country or interests
  const recommendedFieldsCount = [profile.full_name, profile.country, profile.interests?.length > 0].filter(
    Boolean,
  ).length

  // If they have less than 2 of the recommended fields, prompt for completion
  const needsMoreInfo = recommendedFieldsCount < 2

  return needsMoreInfo
}
