"use client"

import dynamic from "next/dynamic"

// Lazy load heavy components with client-side only rendering
export const LazyCommentList = dynamic(() => import("@/components/CommentList").then((mod) => mod.CommentList), {
  loading: () => <div className="h-32 bg-muted rounded" />,
  ssr: false,
})

export const LazyShareButtons = dynamic(() => import("@/components/ShareButtons").then((mod) => mod.ShareButtons), {
  loading: () => null,
  ssr: false,
})

export const LazySearchBox = dynamic(() => import("@/components/SearchBox").then((mod) => mod.SearchBox), {
  loading: () => <div className="h-10 bg-muted rounded" />,
  ssr: false,
})

export const LazyProfileDropdown = dynamic(() => import("@/components/ProfileDropdown").then((mod) => mod.ProfileDropdown), {
  loading: () => null,
  ssr: false,
})

export const LazyBookmarkButton = dynamic(() => import("@/components/BookmarkButton"), {
  loading: () => <div className="w-8 h-8 bg-muted rounded" />,
  ssr: false,
})

export const LazyPaystackButton = dynamic(() => import("@/components/PaystackButton").then((mod) => mod.PaystackButton), {
  loading: () => <div className="h-10 bg-muted rounded" />,
  ssr: false,
})

// Server-side compatible lazy component (no ssr: false)
export const LazyRelatedArticles = dynamic(() => import("@/components/RelatedArticles").then((mod) => mod.RelatedArticles), {
  loading: () => <div className="h-48 bg-muted rounded" />,
})
