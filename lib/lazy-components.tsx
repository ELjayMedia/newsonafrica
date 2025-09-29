"use client"

import dynamic from "next/dynamic"

// Lazy load heavy components with client-side only rendering
export const LazyCommentList = dynamic(() => import("@/components/CommentList"), {
  loading: () => <div className="animate-pulse h-32 bg-muted rounded" />,
  ssr: false,
})

export const LazyShareButtons = dynamic(() => import("@/components/ShareButtons"), {
  loading: () => null,
  ssr: false,
})

export const LazySearchBox = dynamic(() => import("@/components/SearchBox"), {
  loading: () => <div className="animate-pulse h-10 bg-muted rounded" />,
  ssr: false,
})

export const LazyProfileDropdown = dynamic(() => import("@/components/ProfileDropdown"), {
  loading: () => null,
  ssr: false,
})

export const LazyBookmarkButton = dynamic(() => import("@/components/BookmarkButton"), {
  loading: () => <div className="w-8 h-8 bg-muted rounded animate-pulse" />,
  ssr: false,
})

export const LazyPaystackButton = dynamic(() => import("@/components/PaystackButton"), {
  loading: () => <div className="animate-pulse h-10 bg-muted rounded" />,
  ssr: false,
})

// Server-side compatible lazy component (no ssr: false)
export const LazyRelatedArticles = dynamic(() => import("@/components/RelatedArticles"), {
  loading: () => <div className="animate-pulse h-48 bg-muted rounded" />,
})
