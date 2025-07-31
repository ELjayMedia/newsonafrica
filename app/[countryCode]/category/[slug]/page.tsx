import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getPostsByCategory } from "@/lib/api/wordpress"
import CategoryClientPage from "../../../../category/[slug]/CategoryClientPage"

interface CountryCategoryProps {
  params: { countryCode: string; slug: string }
}

export const revalidate = 600
export const dynamicParams = true

export async function generateMetadata({ params }: CountryCategoryProps): Promise<Metadata> {
  const { slug, countryCode } = params
  const { category, posts } = await getPostsByCategory(slug, 10, null, countryCode)
  if (!category) {
    return {
      title: "Category Not Found - News On Africa",
      description: "The requested category could not be found.",
    }
  }
  return {
    title: `${category.name} News - News On Africa`,
    description: category.description || `${category.name} news from News On Africa`,
  }
}

export default async function CountryCategoryPage({ params }: CountryCategoryProps) {
  const { slug, countryCode } = params
  const data = await getPostsByCategory(slug, 20, null, countryCode)
  if (data.category && data.category.slug !== slug) {
    redirect(`/${countryCode}/category/${data.category.slug}`)
  }
  if (!data.category) {
    notFound()
  }
  return <CategoryClientPage params={{ slug }} initialData={data} />
}
