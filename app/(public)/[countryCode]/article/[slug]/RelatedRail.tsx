import type { ReactNode } from "react"
import { cache } from "react"

import { getRelatedPostsForCountry } from "@/lib/wordpress/service"

type RelatedPosts = Awaited<ReturnType<typeof getRelatedPostsForCountry>>

interface RelatedRailProps {
  countryCode: string
  postId: number | null
  children: (relatedPosts: RelatedPosts) => ReactNode
}

const getRelatedPostsSafe = cache(async (countryCode: string, postId: number | null): Promise<RelatedPosts> => {
  if (postId === null) {
    return []
  }

  try {
    return await getRelatedPostsForCountry(countryCode, postId, 6)
  } catch (relatedError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to load related posts for article", {
        relatedError,
        relatedCountry: countryCode,
        relatedPostId: postId,
      })
    }

    return []
  }
})

export async function RelatedRail({ countryCode, postId, children }: RelatedRailProps) {
  const relatedPosts = await getRelatedPostsSafe(countryCode, postId)
  return children(relatedPosts)
}

