"use client"

import { useEffect, useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import { CategoryPage } from "./CategoryPage"
import { CategoryPageSkeleton } from "@/components/CategoryPageSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { notFound } from "next/navigation"
import type { Category, Post } from "@/types/content"

interface CategoryData {
  category: Category | null
  posts: Post[]
  hasNextPage: boolean
  endCursor: string | null
}

interface CategoryClientPageProps {
  params: { countryCode: string; slug: string }
  initialData: CategoryData | null
}

export default function CategoryClientPage({ params, initialData }: CategoryClientPageProps) {
  const [categoryData, setCategoryData] = useState<CategoryData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()
  const country = params.countryCode

  // Memoize the load function to prevent unnecessary re-renders
  const loadCategory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getPostsByCategoryForCountry(country, params.slug, 20)

      if (!data.category) {
        notFound()
      }

      setCategoryData(data)

      // Cache the data in React Query for future use
      queryClient.setQueryData(["category", country, params.slug], {
        pages: [data],
        pageParams: [null],
      })
    } catch (err) {
      console.error(`Error loading category ${params.slug}:`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [params.slug, queryClient, country])

  useEffect(() => {
    // Check if we have cached data first
    const cachedData = queryClient.getQueryData(["category", country, params.slug])

    if (cachedData && !initialData) {
      // Use cached data if available
      const firstPage = (cachedData as any)?.pages?.[0]
      if (firstPage) {
        setCategoryData(firstPage)
        setIsLoading(false)
        return
      }
    }

    // If we have initial data, no need to fetch again
    if (initialData) {
      setCategoryData(initialData)
      setIsLoading(false)
      return
    }

    // Fetch data client-side if not provided (fallback case)
    loadCategory()
  }, [params.slug, initialData, loadCategory, queryClient, country])

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
      <CategoryPage slug={params.slug} countryCode={params.countryCode} initialData={categoryData} />
    </ErrorBoundary>
  )
}
