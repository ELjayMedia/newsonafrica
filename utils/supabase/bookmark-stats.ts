import { createClient } from './client'

export interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
}

export async function getBookmarkStats(userId: string): Promise<BookmarkStats> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_bookmark_stats', {
    user_uuid: userId,
  })

  if (error) {
    console.error('Error fetching bookmark stats:', error)
    throw error
  }

  // Supabase returns the JSON directly
  return (
    data as BookmarkStats | null
  ) ?? { total: 0, unread: 0, categories: {} }
}
