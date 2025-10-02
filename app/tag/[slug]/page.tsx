import { fetchSingleTag, fetchTaggedPosts } from "@/lib/wordpress-api"
import { TagContent } from "@/components/TagContent"
import { TagPageSkeleton } from "@/components/TagPageSkeleton"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 300 // Revalidate every 5 minutes

interface TagPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = await fetchSingleTag(params.slug)
  if (!tag) return { title: "Tag Not Found" }

  return {
    title: `${tag.name} - News On Africa`,
    description: `Articles tagged with ${tag.name} on News On Africa`,
  }
}

export default function TagPage({ params }: TagPageProps) {
  return (
    <Suspense fallback={<TagPageSkeleton />}>
      <TagWrapper slug={params.slug} />
    </Suspense>
  )
}

async function TagWrapper({ slug }: { slug: string }) {
  const tag = await fetchSingleTag(slug)
  if (!tag) notFound()

  const initialData = await fetchTaggedPosts(slug)
  return <TagContent slug={slug} initialData={initialData} tag={tag} />
}
