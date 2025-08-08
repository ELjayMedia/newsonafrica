import { createAdminClient } from "@/lib/supabase"
import { fetchSinglePost } from "@/lib/wordpress"

/**
 * Update all bookmarks referencing a post with the latest data from WordPress
 */
export async function syncBookmarksForPost(postId: string, slug?: string) {
  const supabase = createAdminClient()

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("post_id", postId)

  if (!bookmarks || bookmarks.length === 0) return

  const post = await fetchSinglePost(slug || postId)
  if (!post) return

  const updates = {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    featuredImage: post.featuredImage ? JSON.stringify(post.featuredImage) : null,
  }

  await supabase.from("bookmarks").update(updates).eq("post_id", postId)
}

/**
 * Remove bookmarks when a post is deleted on WordPress
 */
export async function removeBookmarksForPost(postId: string) {
  const supabase = createAdminClient()
  await supabase.from("bookmarks").delete().eq("post_id", postId)
}
