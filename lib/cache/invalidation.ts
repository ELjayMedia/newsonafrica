import { revalidateTag, revalidatePath } from "next/cache"
import { TAG_PREFIX } from "./unified-cache"

/**
 * Centralized cache invalidation handlers
 */

export async function invalidatePost(editionCode: string, postId: string) {
  console.log(`[v0] Invalidating post cache: ${editionCode}:${postId}`)

  // Invalidate specific post
  revalidateTag(`${TAG_PREFIX.POST}:${postId}`)

  // Invalidate edition home page
  revalidateTag(`${TAG_PREFIX.EDITION}:${editionCode}`)

  // Invalidate article page
  revalidatePath(`/${editionCode}/article/[slug]`, "page")
}

export async function invalidateCategory(editionCode: string, categorySlug: string) {
  console.log(`[v0] Invalidating category cache: ${editionCode}:${categorySlug}`)

  revalidateTag(`${TAG_PREFIX.CATEGORY}:${categorySlug}`)
  revalidateTag(`${TAG_PREFIX.EDITION}:${editionCode}`)
  revalidatePath(`/${editionCode}/${categorySlug}`, "page")
}

export async function invalidateEdition(editionCode: string) {
  console.log(`[v0] Invalidating edition cache: ${editionCode}`)

  revalidateTag(`${TAG_PREFIX.EDITION}:${editionCode}`)
  revalidatePath(`/${editionCode}`, "page")
  revalidatePath("/", "page") // Pan-African home if affected
}

export async function invalidateSearch() {
  console.log(`[v0] Invalidating search cache`)

  revalidateTag(TAG_PREFIX.SEARCH)
  revalidatePath("/search", "page")
}
