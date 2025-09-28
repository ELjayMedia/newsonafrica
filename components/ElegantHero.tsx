"use client"

import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import type { HomePost } from "@/types/home"
import { getArticleUrl } from "@/lib/utils/routing"

interface ElegantHeroProps {
  post: HomePost
}

export function ElegantHero({ post }: ElegantHeroProps) {
  const publishedDate = new Date(post.date)
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true })

  return (
    <section className="relative bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="news-category-label">{post.category || "Featured"}</span>
                <span className="news-date">
                  {publishedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <Link href={getArticleUrl(post.slug, post.country)} className="block group">
                <h1 className="news-hero-title group-hover:text-earth-warm transition-colors">{post.title}</h1>
              </Link>

              {post.excerpt && <p className="news-excerpt text-lg md:text-xl">{post.excerpt}</p>}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {post.author && <span className="font-medium">{post.author}</span>}
              <span>{timeAgo}</span>
            </div>

            <Link
              href={getArticleUrl(post.slug, post.country)}
              className="inline-flex items-center gap-2 text-earth-warm hover:text-earth-dark font-medium transition-colors"
            >
              Read Full Story
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/3] relative overflow-hidden rounded-lg">
              <Image
                src={
                  post.featuredImage || `/placeholder.svg?height=600&width=800&query=${encodeURIComponent(post.title)}`
                }
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
