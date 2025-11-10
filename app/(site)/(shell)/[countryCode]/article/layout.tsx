import type { ReactNode } from "react"

import BookmarksProviderClient from "@/components/providers/BookmarksProviderClient"

export default function ArticleLayout({ children }: { children: ReactNode }) {
  return <BookmarksProviderClient>{children}</BookmarksProviderClient>
}
