import { Suspense } from "react"
import env from "@/lib/config/env";
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import BookmarksContent from "@/components/BookmarksContent"
import BookmarksSkeleton from "@/components/BookmarksSkeleton"
import { BookmarkDebugger } from "@/components/BookmarkDebugger"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Bookmarks | News on Africa",
  description: "View and manage your saved articles",
}

export const dynamic = "force-dynamic"

export default async function BookmarksPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Bookmarks</h1>

      {/* Add the debugger in development mode */}
      {env.NODE_ENV === "development" && <BookmarkDebugger />}

      <Suspense fallback={<BookmarksSkeleton />}>
        <BookmarksContent initialSession={session} />
      </Suspense>
    </div>
  )
}
