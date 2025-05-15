"use client"

import { create } from "zustand"

type AuthModalTab = "signin" | "signup" | "reset"

interface AuthModalStore {
  isOpen: boolean
  defaultTab: AuthModalTab
  redirectAfterAuth: boolean
  redirectTo: string
  title: string
  description: string
  onSuccess?: () => void

  open: (options?: {
    defaultTab?: AuthModalTab
    redirectAfterAuth?: boolean
    redirectTo?: string
    title?: string
    description?: string
    onSuccess?: () => void
  }) => void
  close: () => void
}

export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  defaultTab: "signin",
  redirectAfterAuth: false,
  redirectTo: "/",
  title: "Welcome to News On Africa",
  description: "Sign in to access personalized news, bookmarks, and more.",

  open: (options = {}) =>
    set({
      isOpen: true,
      defaultTab: options.defaultTab || "signin",
      redirectAfterAuth: options.redirectAfterAuth ?? false,
      redirectTo: options.redirectTo || "/",
      title: options.title || "Welcome to News On Africa",
      description: options.description || "Sign in to access personalized news, bookmarks, and more.",
      onSuccess: options.onSuccess,
    }),

  close: () => set({ isOpen: false }),
}))
