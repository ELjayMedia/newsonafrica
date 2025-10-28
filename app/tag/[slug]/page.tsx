import { fetchAllTags, fetchSingleTag, fetchTaggedPosts } from "@/lib/wp-server/tags"
import { TagPageSkeleton } from "@/components/TagPageSkeleton"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { TagFeedClient } from "./TagFeedClient"

export const runtime = "nodejs"
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamicParams = true

const STATIC_TAG_COUNT = 20

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const tags = await fetchAllTags()
    return tags
      .filter((tag) => Boolean(tag.slug))
      .slice(0, STATIC_TAG_COUNT)
      .map((tag) => ({ slug: tag.slug! }))
  } catch (error) {
    console.error("Failed to generate static params for tag pages", { error })
    return []
  }
}

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

  const initialData = await fetchTaggedPosts({ slug, countryCode: DEFAULT_COUNTRY, first: 10 })
  return (
    <TagFeedClient
      slug={slug}
      initialData={initialData}
      tag={tag}
      countryCode={DEFAULT_COUNTRY}
    />
  )
}
