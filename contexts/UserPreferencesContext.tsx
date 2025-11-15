"use client"

import { useMemo, type ReactNode } from "react"

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

interface UserPreferencesProviderProps {
  children: ReactNode
  snapshot: UserPreferencesSnapshot | null
}

function normalizeSnapshot(snapshot: UserPreferencesSnapshot | null): UserPreferencesSnapshot {
  if (!snapshot) {
    return {
      userId: null,
      preferences: {
        ...DEFAULT_USER_PREFERENCES,
        sections: [...DEFAULT_USER_PREFERENCES.sections],
        blockedTopics: [...DEFAULT_USER_PREFERENCES.blockedTopics],
        countries: [...DEFAULT_USER_PREFERENCES.countries],
      },
      profilePreferences: {},
    }
  }

  const mergedPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    ...(snapshot.preferences ?? DEFAULT_USER_PREFERENCES),
  }

  return {
    userId: snapshot.userId ?? null,
    preferences: {
      ...mergedPreferences,
      sections: [...mergedPreferences.sections],
      blockedTopics: [...mergedPreferences.blockedTopics],
      countries: [...mergedPreferences.countries],
    },
    profilePreferences: { ...(snapshot.profilePreferences ?? {}) },
  }
}

export function UserPreferencesProvider({ children, snapshot }: UserPreferencesProviderProps) {
  const initialData = useMemo(() => normalizeSnapshot(snapshot), [snapshot])

  return <UserPreferencesClientProvider initialData={initialData}>{children}</UserPreferencesClientProvider>
}
