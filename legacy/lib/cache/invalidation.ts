import { revalidateTag, revalidatePath } from "next/cache"
import { cacheTags } from "./cacheTags"

/**
 * Centralized cache invalidation handlers
 */

export async function invalidatePost(editionCode: string, postId: string) {
  console.log(`[v0] Invalidating post cache: ${editionCode}:${postId}`)

  // Invalidate specific post
  revalidateTag(cacheTags.post(editionCode, postId))

  // Invalidate edition home page
  revalidateTag(cacheTags.edition(editionCode))

  // Invalidate article page
  revalidatePath(`/${editionCode}/article/[slug]`, "page")
}

export async function invalidateCategory(editionCode: string, categorySlug: string) {
  console.log(`[v0] Invalidating category cache: ${editionCode}:${categorySlug}`)

  revalidateTag(cacheTags.category(editionCode, categorySlug))
  revalidateTag(cacheTags.edition(editionCode))
  revalidatePath(`/${editionCode}/${categorySlug}`, "page")
}

export async function invalidateEdition(editionCode: string) {
  console.log(`[v0] Invalidating edition cache: ${editionCode}`)

  revalidateTag(cacheTags.edition(editionCode))
  revalidatePath(`/${editionCode}`, "page")
  revalidatePath("/", "page") // Pan-African home if affected
}

export async function invalidateSearch() {
  console.log(`[v0] Invalidating search cache`)

  revalidateTag(cacheTags.edition("all"))
  revalidatePath("/search", "page")
}
