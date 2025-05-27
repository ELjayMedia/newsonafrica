"use client"

import { useEffect, useState } from "react"
import { getPostsByCategory } from "@/lib/api/wordpress"
import { CategoryPage } from "./CategoryPage"
import { CategoryPageSkeleton } from "@/components/CategoryPageSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { notFound } from "next/navigation"
import type { WordPressCategory, WordPressPost } from "@/lib/api/wordpress"

interface CategoryData {
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

interface CategoryClientPageProps {
  params: { slug: string }
  initialData: CategoryData | null
}

export default function CategoryClientPage({ params, initialData }: CategoryClientPageProps) {
  const [categoryData, setCategoryData] = useState<CategoryData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // If we have initial data, no need to fetch again
    if (initialData) {
      setCategoryData(initialData)
      setIsLoading(false)
      return
    }

    // Fetch data client-side if not provided (fallback case)
    async function loadCategory() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await getPostsByCategory(params.slug, 20)

        if (!data.category) {
          notFound()
        }

        setCategoryData(data)
      } catch (err) {
        console.error(`Error loading category ${params.slug}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    loadCategory()
  }, [params.slug, initialData])

  // Loading state
  if (isLoading) {
    return <CategoryPageSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Category</h1>
        <p className="text-gray-700 mb-4">
          We encountered a problem loading the "{params.slug}" category: {error.message}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Category not found
  if (!categoryData?.category) {
    return notFound()
  }

  return (
    <ErrorBoundary>
      <CategoryPage slug={params.slug} initialData={categoryData} />
    </ErrorBoundary>
  )
}
