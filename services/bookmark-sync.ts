import { createAdminClient } from "@/lib/supabase"
import { fetchSinglePost } from "@/lib/wordpress"

/**
 * Update all bookmarks referencing a post with the latest data from WordPress
 */
export async function syncBookmarksForPost(
  postId: string,
  slug?: string,
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("post_id", postId)

    if (!bookmarks || bookmarks.length === 0) return true

    const post = await fetchSinglePost(slug || postId)
    if (!post) return true

    const updates = {
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      featuredImage: post.featuredImage
        ? JSON.stringify(post.featuredImage)
        : null,
    }

    await supabase.from("bookmarks").update(updates).eq("post_id", postId)
    return true
  } catch (error) {
    console.error(`Failed to sync bookmarks for post ${postId}:`, error)
    return false
  }
}

/**
 * Remove bookmarks when a post is deleted on WordPress
 */
export async function removeBookmarksForPost(postId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    await supabase.from("bookmarks").delete().eq("post_id", postId)
    return true
  } catch (error) {
    console.error(`Failed to remove bookmarks for post ${postId}:`, error)
    return false
  }
}

