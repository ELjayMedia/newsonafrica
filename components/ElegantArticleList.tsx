"use client"

import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import type { HomePost } from "@/types/home"
import { getArticleUrl } from "@/lib/utils/routing"

interface ElegantArticleListProps {
  posts: HomePost[]
  title?: string
  showCategory?: boolean
}

export function ElegantArticleList({ posts, title, showCategory = true }: ElegantArticleListProps) {
  if (!posts.length) return null

  return (
    <section className="space-y-8">
      {title && (
        <div className="text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-earth-dark mb-2">{title}</h2>
          <div className="w-24 h-0.5 bg-earth-warm mx-auto"></div>
        </div>
      )}

      <div className="space-y-8">
        {posts.map((post, index) => {
          const publishedDate = new Date(post.date)
          const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true })

          return (
            <article key={post.id} className="article-list-item group">
              <div className="flex-1 space-y-4">
                <div className="article-meta">
                  <span className="news-date">
                    {publishedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {showCategory && post.category && (
                    <>
                      <span className="text-border">•</span>
                      <span className="news-category-label">{post.category}</span>
                    </>
                  )}
                  {post.author && (
                    <>
                      <span className="text-border">•</span>
                      <span className="font-medium">{post.author}</span>
                    </>
                  )}
                </div>

                <Link href={getArticleUrl(post.slug, post.country)} className="block">
                  <h3 className="news-article-title group-hover:text-earth-warm transition-colors">{post.title}</h3>
                </Link>

                {post.excerpt && <p className="news-excerpt line-clamp-2">{post.excerpt}</p>}

                <Link
                  href={getArticleUrl(post.slug, post.country)}
                  className="inline-flex items-center gap-2 text-sm text-earth-warm hover:text-earth-dark font-medium transition-colors"
                >
                  Continue Reading
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              {post.featuredImage && (
                <div className="w-full md:w-48 lg:w-64 flex-shrink-0">
                  <Link href={getArticleUrl(post.slug, post.country)}>
                    <div className="aspect-[16/10] relative overflow-hidden rounded-lg">
                      <Image
                        src={post.featuredImage || "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
