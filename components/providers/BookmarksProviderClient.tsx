"use client"

import type { ReactNode } from "react"

import { BookmarksProvider } from "@/contexts/BookmarksContext"
import type { BookmarkListPayload } from "@/types/bookmarks"

interface BookmarksProviderClientProps {
  children: ReactNode
  initialData?: BookmarkListPayload | null
}

export default function BookmarksProviderClient({
  children,
  initialData = null,
}: BookmarksProviderClientProps) {
  return <BookmarksProvider initialData={initialData}>{children}</BookmarksProvider>
}
