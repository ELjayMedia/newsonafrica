import CategoryClientPage from "./CategoryClientPage"
import type { Metadata } from "next"
import { fetchSingleCategory } from "@/lib/wordpress-api"

interface CategoryPageProps {
  params: { slug: string }
}

export const revalidate = 60 // Revalidate every 60 seconds

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const category = await fetchSingleCategory(params.slug)
    if (!category) return { title: "Category Not Found" }

    return {
      title: `${category.name} - News On Africa`,
      description: category.description || `Latest articles in the ${category.name} category`,
    }
  } catch (error) {
    console.error(`Error generating metadata for category ${params.slug}:`, error)
    // Return a fallback metadata
    return {
      title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
      description: `Latest articles in the ${params.slug} category`,
    }
  }
}

export default function CategoryServerPage({ params }: CategoryPageProps) {
  return <CategoryClientPage params={params} />
}
