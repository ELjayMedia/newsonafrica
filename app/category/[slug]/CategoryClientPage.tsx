"use client"

import { useEffect, useState } from "react"
import { fetchCategoryPosts } from "@/lib/wordpress-api"
import { CategoryPage } from "./CategoryPage"
import { CategoryPageSkeleton } from "@/components/CategoryPageSkeleton"
import ErrorBoundary from "@/components/ErrorBoundary"
import { notFound } from "next/navigation"

interface CategoryClientPageProps {
  params: { slug: string }
}

export default function CategoryClientPage({ params }: CategoryClientPageProps) {
  const [category, setCategory] = useState<any>(null)
  const [initialData, setInitialData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadCategory() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await fetchCategoryPosts(params.slug)

        if (!data) {
          notFound()
        }

        setCategory(data)
        setInitialData(data)
      } catch (err) {
        console.error(`Error loading category ${params.slug}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    loadCategory()
  }, [params.slug])

  if (isLoading) {
    return <CategoryPageSkeleton />
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Error Loading Category</h1>
        <p className="text-red-600 mb-4">We encountered a problem loading this category: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!category) {
    return notFound()
  }

  return (
    <ErrorBoundary>
      <CategoryPage slug={params.slug} initialData={initialData} />
    </ErrorBoundary>
  )
}
