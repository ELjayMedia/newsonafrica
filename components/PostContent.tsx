"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock, User } from "lucide-react"
import { SocialShare } from "@/components/SocialShare"
import { BookmarkButton } from "@/components/BookmarkButton"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useEffect, useState, useRef } from "react"
import { CommentList } from "@/components/CommentList"
import { formatDate } from "@/utils/date-utils"
import { ErrorBoundary } from "@/components/ErrorBoundary"

interface PostContentProps {
  post: any
  isClient: boolean
}

export function PostContent({ post, isClient }: PostContentProps) {
  const [content, setContent] = useState(post?.content || "")
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (post) {
      // Process content to insert ads
      setContent(insertAdsInContent(post.content))
    }
  }, [post])

  useEffect(() => {
    if (isClient && contentRef.current) {
      // Process ad placeholders
      const adPlaceholders = contentRef.current.querySelectorAll(".ad-placeholder")
      adPlaceholders.forEach((placeholder, index) => {
        // Create a new div for the ad
        const adContainer = document.createElement("div")
        adContainer.className = "my-4"

        // Replace the placeholder with the ad container
        placeholder.parentNode?.replaceChild(adContainer, placeholder)

        // Render the ad component into the container
        const adElement = document.createElement("div")
        adContainer.appendChild(adElement)

        // Create a new instance of AdComponent
        const adComponent = document.createElement("div")
        adComponent.className = "w-full flex justify-center"
        adComponent.innerHTML = `<div class="ad-slot" data-ad-index="${index}"></div>`
        adElement.appendChild(adComponent)
      })
    }
  }, [content, isClient])

  if (!post) {
    return <div>Post not found</div>
  }

  const insertAdsInContent = (content: string) => {
    if (!content) return ""

    const paragraphs = content.split("</p>")
    const totalParagraphs = paragraphs.length

    // Only insert ads if there are enough paragraphs
    if (totalParagraphs < 4) return content

    const adIndexes = [
      Math.min(Math.floor(totalParagraphs * 0.25), 3),
      Math.min(Math.floor(totalParagraphs * 0.5), totalParagraphs - 3),
      Math.min(Math.floor(totalParagraphs * 0.75), totalParagraphs - 2),
    ]

    const adComponent = (index: number) => `
      <div class="ad-placeholder" data-ad-index="${index}"></div>
    `

    adIndexes.forEach((index, i) => {
      if (totalParagraphs > index) {
        paragraphs.splice(index + i, 0, adComponent(i))
      }
    })

    return paragraphs.join("</p>")
  }

  return (
    <article className="max-w-3xl mx-auto px-1 sm:px-2 md:px-4">
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
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
            <div className="md:hidden flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <div className="flex items-center space-x-2">
              <SocialShare
                url={`https://newsonafrica.com/post/${post.slug}`}
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
            <Link href={`/author/${post.author.node.slug}`} className="hover:underline text-gray-600 text-sm">
              {post.author.node.name}
            </Link>
          </div>
          {isClient && <BookmarkButton post={post} />}
        </div>
      </header>

      {post.featuredImage && (
        <div className="relative w-full aspect-[16/9] mb-4 sm:mb-6">
          <Image
            src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
            alt={post.featuredImage.node.altText || post.title}
            fill
            className="rounded-lg object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <div
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: content }}
        className="prose prose-xs sm:prose-sm max-w-none space-y-3 sm:space-y-4"
      />

      <footer className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
          <div className="sm:max-w-[60%]">
            <p className="text-gray-600">
              By{" "}
              <Link href={`/author/${post.author.node.slug}`} className="font-semibold hover:underline">
                {post.author.node.name}
              </Link>
            </p>
            <p className="text-sm text-gray-500 mt-1">Last updated: {formatDate(post.modified, true)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.categories?.nodes?.map((category: any) => (
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
        <div className="mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-semibold mb-2">Tags:</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags?.nodes?.map((tag: any) => (
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
      </footer>

      {/* Comments Section */}
      {isClient && (
        <ErrorBoundary
          fallback={
            <div className="mt-8 p-4 bg-red-50 rounded">Error loading comments. Please try refreshing the page.</div>
          }
        >
          <div className="mt-8">
            <CommentList postId={post.id} />
          </div>
        </ErrorBoundary>
      )}
    </article>
  )
}
