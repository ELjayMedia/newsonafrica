import { HomeContent } from "@/components/HomeContent"
import { HomePageSkeleton } from "@/components/HomePageSkeleton"
import { fetchFeaturedPosts, fetchCategorizedPosts, fetchTaggedPosts, fetchRecentPosts } from "@/lib/wordpress-api"
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

async function HomeContentWrapper() {
  try {
    const [taggedPosts, featuredPosts, categories, recentPosts] = await Promise.all([
      fetchTaggedPosts("fp", 1),
      fetchFeaturedPosts(),
      fetchCategorizedPosts(),
      fetchRecentPosts(10),
    ])

    return <HomeContent initialData={{ taggedPosts, featuredPosts, categories, recentPosts }} />
  } catch (error) {
    console.error("Error fetching initial data:", error)
    throw error // This will be caught by Next.js error page
  }
}
