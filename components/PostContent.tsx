"use client"

import type React from "react"
import { CommentList } from "@/components/CommentList"
import type { Post } from "@/types/post"
import type { Category } from "@/types/category"
import Image from "next/image"
import Link from "next/link"
import { RelatedPosts } from "@/components/RelatedPosts"
import { SocialShare } from "@/components/SocialShare"
import { BookmarkButton } from "@/components/BookmarkButton"
import { Clock } from "lucide-react"
import { CommentButton } from "@/components/CommentButton"
import { GiftArticleButton } from "@/components/GiftArticleButton"
import { formatPostDate } from "@/lib/date"
import { useNavigationRouting } from "@/hooks/useNavigationRouting"

interface PostContentProps {
  post: Post
}

export const PostContent: React.FC<PostContentProps> = ({ post }) => {
  if (!post) {
    return <div>Loading...</div>
  }

  const { getCategoryPath } = useNavigationRouting()

  return (
    <div className="container mx-auto px-4 pb-6 bg-white">
      <article className="mb-8">
        {/* Top date and share section */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="flex items-center text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <time dateTime={post.date}>{post.date ? formatPostDate(post.date) : "Unknown date"}</time>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">Share</span>
            <SocialShare
              url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://newsonafrica.com"}/post/${post.slug}`}
              title={post.title}
              description={post.excerpt || post.title}
              className="flex items-center gap-1"
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {/* Author and publication */}
        <div className="flex items-center justify-between mb-4 md:mb-3">
          <div className="flex flex-col">
            {post.author && (
              <Link
                href={`/author/${post.author.node.slug}`}
                className="font-medium hover:underline text-sm md:text-base"
              >
                {post.author.node.name}
              </Link>
            )}
          </div>

          {/* Interactive buttons */}
          <div className="flex flex-wrap gap-1 md:gap-2">
            <CommentButton
              className="border border-input bg-background rounded-full flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            />

            <GiftArticleButton postSlug={post.slug} postTitle={post.title} />

            <BookmarkButton post={post} />
          </div>
        </div>

        {/* Featured image */}
        {post.featuredImage && post.featuredImage.node.sourceUrl && (
          <div className="mb-6">
            <Image
              src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={post.featuredImage.node.altText || post.title}
              width={1200}
              height={675}
              className="w-full rounded-lg"
              priority
            />
            {post.featuredImage.node.caption && (
              <figcaption
                className="text-sm text-gray-500 mt-2"
                dangerouslySetInnerHTML={{ __html: post.featuredImage.node.caption }}
              />
            )}
          </div>
        )}

        {/* Article content */}
        <div
          className="prose prose-lg max-w-none mb-8 text-sm text-black"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Categories and tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.categories?.nodes?.map((category: Category) => (
            <Link
              key={category.id}
              href={getCategoryPath(category.slug)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Bottom Social Sharing */}
        <div className="flex items-center justify-center py-6 border-t border-gray-200 mt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Found this article helpful? Share it with others!</p>
            <SocialShare
              url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://newsonafrica.com"}/post/${post.slug}`}
              title={post.title}
              description={post.excerpt || post.title}
              className="flex items-center justify-center gap-2"
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <CommentList postId={post.id} />
        </div>

        {/* Related Posts */}
        <RelatedPosts categories={post.categories?.nodes || []} currentPostId={post.id} />
      </article>
    </div>
  )
}
