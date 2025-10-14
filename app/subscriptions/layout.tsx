import type React from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { UserPreferencesHydrator } from "@/contexts/UserPreferencesContext"

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserPreferencesHydrator>
      <ProtectedRoute>{children}</ProtectedRoute>
    </UserPreferencesHydrator>
  )
}
