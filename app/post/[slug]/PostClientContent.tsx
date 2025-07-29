"use client"

import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"
import { Clock, User } from "lucide-react"
import { SocialShare } from "@/components/SocialShare"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useEffect, useState, useRef } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchSinglePost } from "@/lib/wordpress-api/fetch"
import { PostSkeleton } from "@/components/PostSkeleton"
import { AdSense } from "@/components/AdSense"
import { CommentList } from "@/components/CommentList"

// Define ad positions for content
const AD_POSITIONS = [3, 7, 11]

export function PostClientContent({ slug, initialData }: { slug: string; initialData: any }) {
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchSinglePost(slug),
    initialData,
  })

  const [processedContent, setProcessedContent] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const adsInitialized = useRef(false)

  // Process content to insert ad placeholders
  useEffect(() => {
    if (post?.content) {
      // Calculate ad positions based on content length
      const paragraphs = post.content.split("</p>").length
      const adPositions = []

      // Dynamically determine ad positions based on content length
      if (paragraphs >= 4) adPositions.push(3)
      if (paragraphs >= 8) adPositions.push(7)
      if (paragraphs >= 12) adPositions.push(11)

      // Insert ad placeholders
      let contentWithAds = post.content
      if (adPositions.length > 0) {
        const paragraphs = contentWithAds.split("</p>")

        // Insert placeholders at specified positions
        adPositions.forEach((position, index) => {
          // Skip if position is out of bounds
          if (position >= paragraphs.length) return

          // Add placeholder div with unique ID
          const placeholderId = `ad-placeholder-${index}`
          paragraphs[position] = `${paragraphs[position]}</p><div id="${placeholderId}" class="my-4"></div>`
        })

        contentWithAds = paragraphs.join("</p>")
      }

      setProcessedContent(contentWithAds)
    }
  }, [post?.content])

  // Render ads in placeholders after content is rendered
  useEffect(() => {
    // Only run once
    if (adsInitialized.current || !contentRef.current || !processedContent) return

    // Mark as initialized to prevent multiple attempts
    adsInitialized.current = true

    // Wait for DOM to be fully rendered
    setTimeout(() => {
      // Find all ad placeholders
      const placeholders = contentRef.current?.querySelectorAll('[id^="ad-placeholder-"]')
      if (!placeholders || placeholders.length === 0) return

      // Create ad components in each placeholder
      placeholders.forEach((placeholder, index) => {
        // Create container for AdSense component
        const adContainer = document.createElement("div")
        adContainer.className = "ad-container"

        // Replace placeholder with container
        placeholder.parentNode?.replaceChild(adContainer, placeholder)

        // Create React root and render AdSense component
        // Note: We're not using ReactDOM.render here as we're just preparing the container
        // The actual AdSense ads will be initialized by the script
      })
    }, 100)
  }, [processedContent])

  if (isLoading) return <PostSkeleton />
  if (error) return <div>Error loading article: {(error as Error).message}</div>
  if (!post) return <div>Article not found</div>

  return (
    <ErrorBoundary>
      <article className="max-w-3xl mx-auto px-1 sm:px-2 md:px-4">
        <ArticleJsonLd post={post} url={`https://newsonafrica.com/post/${slug}`} />

        <Breadcrumbs
          items={[
            {
              label: post.categories?.nodes?.[0]?.name || "Uncategorized",
              href: `/category/${post.categories?.nodes?.[0]?.slug || "uncategorized"}`,
            },
            { label: post.title, href: `/post/${post.slug}` },
          ]}
        />

        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-gray-600 text-sm space-y-2 md:space-y-0 mb-2 md:mb-4">
            <div className="hidden md:flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
              <div className="md:hidden flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className="flex items-center space-x-2">
                <SocialShare
                  url={`https://newsonafrica.com/post/${slug}`}
                  title={post.title}
                  description={post.excerpt}
                />
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4">{post.title}</h1>

          <div className="flex items-center justify-between mt-2 md:mt-0">
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              <Link href={`/author/${post.author?.node?.slug}`} className="hover:underline text-gray-600 text-sm">
                {post.author?.node?.name}
              </Link>
            </div>
            <BookmarkButton post={post} />
          </div>
        </header>

        {post.featuredImage && (
          <div className="relative w-full aspect-[16/9] mb-4 sm:mb-6">
            <Image
              src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={post.featuredImage.node.altText || post.title}
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
              loading="eager"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>
        )}

        {/* Article Content */}
        <div
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: processedContent || post.content || "" }}
          className="prose prose-sm sm:prose-base lg:prose-lg max-w-none space-y-4"
        />

        {/* Bottom ads - using AdSense component with unique IDs */}
        <div className="my-6">
          <AdSense slot="7364467238" format="rectangle" className="mx-auto" id="post-bottom-ad-1" />
        </div>

        {/* Comments Section */}
        <ErrorBoundary>
          <div className="mt-8">
            <CommentList postId={post.id} />
          </div>
        </ErrorBoundary>

        <footer className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
            <div className="sm:max-w-[60%]">
              <p className="text-gray-600">
                By{" "}
                <Link href={`/author/${post.author?.node?.slug}`} className="font-semibold hover:underline">
                  {post.author?.node?.name}
                </Link>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated:{" "}
                {new Date(post.modified).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.categories?.nodes?.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {post.tags?.nodes?.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold mb-2">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.nodes.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/tag/${tag.slug}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm px-2 py-1 rounded"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </footer>
      </article>
    </ErrorBoundary>
  )
}
