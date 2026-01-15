import { revalidateTag } from "next/cache"

/**
 * Wrapper around Next.js tag revalidation that swallows individual failures.
 */
export function revalidateByTag(tag: string): void {
  try {
    revalidateTag(tag)
  } catch (error) {
    console.error(`Error revalidating tag ${tag}:`, error)
  }
}
