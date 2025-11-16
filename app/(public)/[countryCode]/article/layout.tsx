import type { ReactNode } from "react"

import { BookmarksProvider } from "@/contexts/BookmarksContext"

export default function ArticleLayout({ children }: { children: ReactNode }) {
  return <BookmarksProvider>{children}</BookmarksProvider>
}
