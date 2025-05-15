"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchSinglePost } from "@/lib/wordpress-api"
import { PostContent } from "@/components/PostContent"
import { PostSkeleton } from "@/components/PostSkeleton"
import { ErrorMessage } from "@/components/ErrorMessage"

interface PostClientContentProps {
  slug: string
  initialData?: any
}

export function PostClientContent({ slug, initialData }: PostClientContentProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchSinglePost(slug),
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  })

  // Handle loading state
  if (isLoading && !initialData) {
    return <PostSkeleton />
  }

  // Handle error state
  if (error) {
    console.error("Error fetching post:", error)
    return <ErrorMessage message="Failed to load the article. Please try again later." />
  }

  // Handle not found
  if (!post) {
    return <ErrorMessage message="Article not found" />
  }

  // Render the post content
  return <PostContent post={post} isClient={isClient} />
}
