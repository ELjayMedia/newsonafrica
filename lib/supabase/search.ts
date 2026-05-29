import { createServerClient } from "@/lib/supabase/server"

export interface SupabaseSearchResult {
  id: string
  edition_code: string
  wp_post_id: number
  slug: string
  title: string
  excerpt: string | null
  tags: string[]
  categories: string[]
  author: string | null
  published_at: string
  url_path: string
  featured_image_url: string | null
  rank?: number
}

export async function syncPostToIndex(post: {
  edition_code: string
  wp_post_id: number
  slug: string
  title: string
  excerpt?: string
  content_plain?: string
  tags?: string[]
  categories?: string[]
  author?: string
  published_at: string
  url_path: string
  featured_image_url?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  if (!supabase) return { success: false, error: "Supabase unavailable" }

  const { error } = await supabase.from("content_index").upsert(
    {
      edition_code: post.edition_code,
      wp_post_id: post.wp_post_id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || null,
      content_plain: post.content_plain || null,
      tags: post.tags || [],
      categories: post.categories || [],
      author: post.author || null,
      published_at: post.published_at,
      url_path: post.url_path,
      featured_image_url: post.featured_image_url || null,
    },
    {
      onConflict: "edition_code,wp_post_id",
    },
  )

  if (error) {
    console.error("Sync post to index error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deletePostFromIndex(
  edition_code: string,
  wp_post_id: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  if (!supabase) return { success: false, error: "Supabase unavailable" }

  const { error } = await supabase.from("content_index").delete().match({ edition_code, wp_post_id })

  if (error) {
    console.error("Delete post from index error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
