import type { ReactNode } from "react"
import dynamic from "next/dynamic"

const BookmarksProviderClient = dynamic(
  () => import("@/components/providers/BookmarksProviderClient"),
  { ssr: false },
)

export default function ArticleLayout({ children }: { children: ReactNode }) {
  return <BookmarksProviderClient>{children}</BookmarksProviderClient>
}
