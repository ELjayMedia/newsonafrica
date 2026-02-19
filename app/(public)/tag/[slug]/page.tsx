import { fetchSingleTag, fetchTaggedPosts } from "@/lib/wp-server/tags"
import { TagPageSkeleton } from "@/components/TagPageSkeleton"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { TagFeedClient } from "./TagFeedClient"

export const runtime = "nodejs"
export const dynamic = "force-static"
export const dynamicParams = true
export const revalidate = 300

interface TagPageProps {
  params: { slug: string }
}

type TagForClient = {
  name: string
  description?: string
}

function normalizeTagForClient(tag: unknown, slug: string): TagForClient {
  const t = tag as { name?: string; description?: string | null } | null | undefined
  const name = t?.name?.trim()

  return {
    name: name && name.length > 0 ? name : slug,
    description: t?.description ?? undefined,
  }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = await fetchSingleTag(params.slug)
  if (!tag) return { title: "Tag Not Found" }

  const safe = normalizeTagForClient(tag, params.slug)

  return {
    title: `${safe.name} - News On Africa`,
    description: `Articles tagged with ${safe.name} on News On Africa`,
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

  const safeTag = normalizeTagForClient(tag, slug)

  const initialData = await fetchTaggedPosts({ slug, countryCode: DEFAULT_COUNTRY, first: 10 })

  return <TagFeedClient slug={slug} initialData={initialData} tag={safeTag} countryCode={DEFAULT_COUNTRY} />
}