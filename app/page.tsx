"use client"

import { HomeContent } from "@/components/HomeContent"
import { HomePageSkeleton } from "@/components/HomePageSkeleton"
import { fetchTaggedPosts, fetchFeaturedPosts, fetchCategorizedPosts, fetchRecentPosts } from "@/lib/wordpress-api"
import ErrorBoundary from "@/components/ErrorBoundary"
import { Suspense } from "react"

export const revalidate = 60 // Revalidate every 60 seconds

export default async function Home() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <ErrorBoundary>
        <HomeContentWrapper />
      </ErrorBoundary>
    </Suspense>
  )
}

// Update the HomeContentWrapper function to better handle errors and preserve data
async function HomeContentWrapper() {
  try {
    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled([
      fetchTaggedPosts("fp", 4),
      fetchFeaturedPosts(4),
      fetchCategorizedPosts(),
      fetchRecentPosts(10),
    ])

    // Extract successful results or use empty arrays as fallbacks
    const taggedPosts = results[0].status === "fulfilled" ? results[0].value : []
    const featuredPosts = results[1].status === "fulfilled" ? results[1].value : []
    const categories = results[2].status === "fulfilled" ? results[2].value : []
    const recentPosts = results[3].status === "fulfilled" ? results[3].value : []

    // Always return the HomeContent component with whatever data we have
    return <HomeContent initialData={{ taggedPosts, featuredPosts, categories, recentPosts }} />
  } catch (error) {
    console.error("Error fetching initial data:", error)
    // Return HomeContent with empty arrays instead of an error message
    return <HomeContent initialData={{ taggedPosts: [], featuredPosts: [], categories: [], recentPosts: [] }} />
  }
}
