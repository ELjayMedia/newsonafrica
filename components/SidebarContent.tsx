"use client"

import { useMemo, useCallback } from "react"
import { getCurrentCountry, getArticleUrl } from "@/lib/utils/routing"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { useSidebarContent } from "@/hooks/useSidebarContent"
import { SidebarErrorState } from "./SidebarErrorState"
import { SidebarEmptyState } from "./SidebarEmptyState"
import { MostReadList } from "./MostReadList"
import { PersonalizedList } from "./PersonalizedList"

type SidebarPost = {
  id: string
  slug: string
  title: string
  date?: string | null
  categories?: { nodes?: Array<{ slug?: string | null; name?: string | null }> } | null
  featuredImage?: {
    node?: {
      sourceUrl?: string | null
      altText?: string | null
    }
  } | null
}

export function SidebarContent() {
  const country = getCurrentCountry()
  const { preferences } = useUserPreferences()

  const preferredSections = useMemo(
    () => preferences.sections.map((section) => section.toLowerCase()),
    [preferences.sections],
  )

  const { data, error, isLoading, mutate } = useSidebarContent(country)

  const recentPosts: SidebarPost[] = Array.isArray(data?.recent)
    ? (data?.recent as SidebarPost[])
    : []
  const mostReadPosts: SidebarPost[] = Array.isArray(data?.mostRead)
    ? (data?.mostRead as SidebarPost[])
    : []

  const personalizedPosts = useMemo(() => {
    if (!recentPosts.length) {
      return []
    }

    if (!preferredSections.length) {
      return recentPosts
    }

    const matches = recentPosts.filter((post) => {
      const categories = post.categories?.nodes || []
      return categories.some((category: any) => {
        const slug = (category?.slug || category?.name || "").toLowerCase()
        return slug && preferredSections.includes(slug)
      })
    })

    return matches.length > 0 ? matches : recentPosts
  }, [recentPosts, preferredSections])

  const mostReadItems = useMemo(
    () =>
      mostReadPosts.map((post) => ({
        id: post.id,
        title: post.title,
        href: getArticleUrl(post.slug),
        date: post.date ?? null,
      })),
    [mostReadPosts],
  )

  const personalizedItems = useMemo(
    () =>
      personalizedPosts.map((post) => ({
        id: post.id,
        title: post.title,
        href: getArticleUrl(post.slug),
        date: post.date ?? null,
        imageUrl: post.featuredImage?.node?.sourceUrl ?? null,
        imageAlt: post.featuredImage?.node?.altText ?? post.title,
      })),
    [personalizedPosts],
  )

  const handleRetry = useCallback(() => {
    mutate()
  }, [mutate])

  if (isLoading) {
    return <SidebarSkeleton />
  }

  if (error) {
    return <SidebarErrorState onRetry={handleRetry} />
  }

  if (personalizedItems.length === 0 && mostReadItems.length === 0) {
    return <SidebarEmptyState />
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {mostReadItems.length > 0 && <MostReadList posts={mostReadItems} />}

        {personalizedItems.length > 0 && (
          <PersonalizedList
            posts={personalizedItems}
            title={preferredSections.length > 0 ? "For You" : "Latest News"}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
