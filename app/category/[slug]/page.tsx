import { fetchCategoryPosts, fetchSingleCategory } from "@/lib/wordpress-api"
import CategoryPage from "./CategoryPage"
import { CategoryPageSkeleton } from "@/components/CategoryPageSkeleton"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

export const revalidate = 60 // Revalidate every 60 seconds

interface CategoryPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await fetchSingleCategory(params.slug)
  if (!category) return { title: "Category Not Found" }

  return {
    title: `${category.name} - News On Africa`,
    description: category.description || `Latest articles in the ${category.name} category`,
  }
}

export default function CategoryServerPage({ params }: CategoryPageProps) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageWrapper slug={params.slug} />
    </Suspense>
  )
}

async function CategoryPageWrapper({ slug }: { slug: string }) {
  const category = await fetchSingleCategory(slug)
  if (!category) notFound()

  const initialData = await fetchCategoryPosts(slug)
  return <CategoryPage slug={slug} initialData={initialData} />
}
