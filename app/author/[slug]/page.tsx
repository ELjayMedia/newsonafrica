import type { Metadata } from "next"
import { fetchAuthorData } from "@/lib/wordpress-api"
import { AuthorContent } from "./AuthorContent"
import { AuthorPageSkeleton } from "@/components/AuthorPageSkeleton"
import { Suspense } from "react"

export const revalidate = 60 // Revalidate every 60 seconds

interface AuthorPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const authorData = await fetchAuthorData(params.slug)
  if (!authorData) return { title: "Author Not Found" }

  return {
    title: `${authorData.name} - News On Africa`,
    description: authorData.description || `Articles by ${authorData.name}`,
  }
}

export default function AuthorPage({ params }: AuthorPageProps) {
  return (
    <Suspense fallback={<AuthorPageSkeleton />}>
      <AuthorWrapper slug={params.slug} />
    </Suspense>
  )
}

async function AuthorWrapper({ slug }: { slug: string }) {
  const authorData = await fetchAuthorData(slug)
  return <AuthorContent initialData={authorData} slug={slug} />
}
