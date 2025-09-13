"use client"

import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"
import { Clock, User } from "lucide-react"
import { SocialShare } from "@/components/SocialShare"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import ErrorBoundary from "@/components/ErrorBoundary"
import { fetchSinglePost } from "@/lib/wordpress-api"
import { PostSkeleton } from "@/components/PostSkeleton"
import { CommentList } from "@/components/CommentList"


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
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
          className="prose prose-sm sm:prose-base lg:prose-lg max-w-none space-y-4"
        />

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
