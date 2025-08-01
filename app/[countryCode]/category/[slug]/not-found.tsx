"use client"

import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"
import { useNavigationRouting } from "@/hooks/useNavigationRouting"

export default function CategoryNotFound() {
  const { currentCountry } = useNavigationRouting()

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600">The category you're looking for doesn't exist or has been moved.</p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/${currentCountry}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">Browse our popular categories:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["news", "business", "sports", "entertainment", "politics"].map((category) => (
              <Link
                key={category}
                href={`/${currentCountry}/category/${category}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
