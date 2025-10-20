"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

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
}

type PreferencesResponse = Partial<UserPreferencesSnapshot> | null

function createDefaultSnapshot(): UserPreferencesSnapshot {
  return {
    userId: null,
    preferences: { ...DEFAULT_USER_PREFERENCES },
    profilePreferences: {},
  }
}

function normalizeResponse(snapshot: PreferencesResponse): UserPreferencesSnapshot {
  if (!snapshot) {
    return createDefaultSnapshot()
  }

  return {
    userId: snapshot.userId ?? null,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...(snapshot.preferences ?? {}),
    },
    profilePreferences: snapshot.profilePreferences ?? {},
  }
}

function areSnapshotsEqual(a: UserPreferencesSnapshot, b: UserPreferencesSnapshot) {
  if (a.userId !== b.userId) {
    return false
  }

  const preferencesEqual = JSON.stringify(a.preferences) === JSON.stringify(b.preferences)
  if (!preferencesEqual) {
    return false
  }

  return JSON.stringify(a.profilePreferences) === JSON.stringify(b.profilePreferences)
}

export function UserPreferencesProvider({ children }: UserPreferencesProviderProps) {
  const [snapshot, setSnapshot] = useState<UserPreferencesSnapshot>(() => createDefaultSnapshot())
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load user preferences: ${response.status}`)
        }

        if (response.status === 204) {
          return
        }

        const payload = (await response.json()) as PreferencesResponse
        if (!isMounted) {
          return
        }

        const normalized = normalizeResponse(payload)

        setSnapshot((current) => {
          if (areSnapshotsEqual(current, normalized)) {
            return current
          }

          setVersion((value) => value + 1)
          return normalized
        })
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return
        }
        console.error("Failed to fetch user preferences:", error)
      }
    }

    void loadPreferences()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const initialData = useMemo<UserPreferencesSnapshot>(() => {
    return {
      userId: snapshot.userId ?? null,
      preferences: {
        ...DEFAULT_USER_PREFERENCES,
        ...snapshot.preferences,
      },
      profilePreferences: { ...snapshot.profilePreferences },
    }
  }, [snapshot])

  return (
    <UserPreferencesClientProvider key={version} initialData={initialData}>
      {children}
    </UserPreferencesClientProvider>
  )
}
