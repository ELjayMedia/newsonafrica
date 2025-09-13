"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getPostBySlug } from "@/lib/wordpress-api"
import type { WordPressPost } from "@/lib/wordpress-api"
import { PostContent } from "@/components/PostContent"
import { PostSkeleton } from "@/components/PostSkeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

interface PostClientContentProps {
  slug: string
  initialData?: WordPressPost | null
}

export function PostClientContent({ slug, initialData }: PostClientContentProps) {
  const [post, setPost] = useState<WordPressPost | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // If we have initial data, don't fetch again
    if (initialData) {
      setPost(initialData)
      setLoading(false)
      return
    }

    // Fetch post data if not provided server-side
    async function fetchPost() {
      try {
        setLoading(true)
        setError(null)

        const fetchedPost = await getPostBySlug(slug)

        if (!fetchedPost) {
          setError("Article not found")
          return
        }

        setPost(fetchedPost)
      } catch (err) {
        console.error("Error fetching post:", err)
        setError("Failed to load article. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [slug, initialData])

  // Loading state
  if (loading) {
    return <PostSkeleton />
  }

  // Error state
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error === "Article not found" ? "Article Not Found" : "Error Loading Article"}
          </h1>
          <p className="text-gray-600 mb-6">
            {error === "Article not found"
              ? "The article you're looking for doesn't exist or has been moved."
              : "We encountered an error while loading this article. Please try again."}
          </p>

          <div className="space-y-3">
            {error !== "Article not found" && (
              <Button onClick={() => window.location.reload()} className="w-full" variant="default">
                Try again
              </Button>
            )}

            <Button onClick={() => router.push("/")} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to homepage
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render post content
  return <PostContent post={post} />
}
