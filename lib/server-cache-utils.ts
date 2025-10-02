import { revalidatePath, revalidateTag } from "next/cache"

/**
 * Attempt to revalidate a collection of paths. Errors are logged but do not
 * interrupt the rest of the revalidation run to prevent cascading failures.
 */
export function revalidateMultiplePaths(paths: string[]): void {
  paths.forEach((path) => {
    try {
      revalidatePath(path)
    } catch (error) {
      console.error(`Error revalidating path ${path}:`, error)
    }
  })
}

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

export function revalidateByTags(tags: string[]): void {
  tags.forEach((tag) => {
    try {
      revalidateTag(tag)
    } catch (error) {
      console.error(`Error revalidating tag ${tag}:`, error)
    }
  })
}
