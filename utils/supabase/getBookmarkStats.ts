import { createClient } from "./client"

export interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
}

export async function getBookmarkStats(
  userId: string,
  supabase = createClient(),
): Promise<BookmarkStats> {
  const { data, error } = await supabase
    .rpc("get_bookmark_stats", { user_uuid: userId })
    .single()

  if (error) {
    throw error
  }

  return (
    data || { total: 0, unread: 0, categories: {} }
  ) as BookmarkStats
}
