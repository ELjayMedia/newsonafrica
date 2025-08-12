import { fetchPostsByTag, fetchSingleTag } from "@/lib/api/wordpress"
import { TagContent } from "@/components/TagContent"
import { TagPageSkeleton } from "@/components/TagPageSkeleton"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

export const revalidate = 60 // Revalidate every 60 seconds

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

  const initialData = await fetchPostsByTag(slug)
  return <TagContent slug={slug} initialData={initialData} tag={tag} />
}
