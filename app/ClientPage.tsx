"use client"

import { Suspense } from "react"
import { HomeContent } from "@/components/HomeContent"
import { HomePageSkeleton } from "@/components/HomePageSkeleton"
import { fetchTaggedPosts, fetchFeaturedPosts, fetchCategorizedPosts, fetchRecentPosts } from "@/lib/wordpress-api"
import ErrorBoundary from "@/components/ErrorBoundary"

function FallbackHomeContent() {
  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-2">Unable to load content</h2>
      <p>We're experiencing technical difficulties. Please try again later.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
      >
        Refresh Page
      </button>
    </div>
  )
}

// Optimize data fetching with Promise.allSettled and better error handling
async function HomeContentWrapper() {
  try {
    // Use Promise.allSettled for parallel data fetching with fault tolerance
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

export default function ClientPage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <ErrorBoundary fallback={<FallbackHomeContent />}>
        <HomeContentWrapper />
      </ErrorBoundary>
    </Suspense>
  )
}
