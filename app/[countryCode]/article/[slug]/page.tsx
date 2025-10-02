import { notFound } from "next/navigation"
import { fetchFromWp, type WordPressPost } from "@/lib/wordpress-api"
import { wordpressQueries } from "@/lib/wordpress-queries"
import { ArticleClientContent } from "./ArticleClientContent"
import * as log from "@/lib/log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 300

type RouteParams = { countryCode: string; slug: string }

type ArticlePageProps = {
  params: Promise<RouteParams>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ params }: ArticlePageProps) {
  const { slug, countryCode } = await params
  const country = (countryCode || "DEFAULT").toLowerCase()
  let post: WordPressPost | null = null

  try {
    const restPosts = (await fetchFromWp<WordPressPost[]>(country, wordpressQueries.postBySlug(slug))) || []
    post = restPosts[0] || null
  } catch (error) {
    log.error("REST postBySlug fetch failed", { error })
  }

  if (!post) {
    return notFound()
  }

  return <ArticleClientContent slug={slug} countryCode={country} initialData={post} />
}

export async function generateStaticParams(): Promise<RouteParams[]> {
  // Avoid build-time network I/O by deferring article fetching to runtime
  return []
}
