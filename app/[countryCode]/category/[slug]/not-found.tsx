"use client"

import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCategoryUrl } from "@/lib/utils/routing"

export default function CategoryNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600">The category you're looking for doesn't exist or has been moved.</p>
        </div>

        <div className="space-y-4">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Link>
          </Button>

          <Button onClick={() => window.history.back()} variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">Browse our popular categories:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["news", "business", "sports", "entertainment", "politics"].map((category) => (
              <Link
                key={category}
                href={getCategoryUrl(category)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
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
