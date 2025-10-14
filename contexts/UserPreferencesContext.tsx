import type { ReactNode } from "react"

import { getUserPreferences } from "@/app/actions/preferences"
import type { UserPreferencesSnapshot } from "@/app/actions/preferences"
import { UserPreferencesClientProvider } from "./UserPreferencesClient"
import {
  DEFAULT_USER_PREFERENCES,
  type ThemePreference,
  type BookmarkSortPreference,
  type UserPreferences,
} from "@/types/user-preferences"

export { useUserPreferences } from "./UserPreferencesClient"
export type { UserPreferencesContextValue } from "./UserPreferencesClient"
export type { ThemePreference, BookmarkSortPreference, UserPreferences }

function createDefaultSnapshot(): UserPreferencesSnapshot {
  return {
    userId: null,
    preferences: { ...DEFAULT_USER_PREFERENCES },
    profilePreferences: {},
  }
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  return (
    <UserPreferencesClientProvider initialData={createDefaultSnapshot()}>
      {children}
    </UserPreferencesClientProvider>
  )
}

export async function UserPreferencesHydrator({ children }: { children: ReactNode }) {
  const result = await getUserPreferences()

  if (result.error) {
    console.error("Failed to load user preferences:", result.error)
  }

  const initialData = result.data ?? createDefaultSnapshot()

  return (
    <UserPreferencesClientProvider initialData={initialData}>
      {children}
    </UserPreferencesClientProvider>
  )
}
