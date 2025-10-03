import { NextRequest, NextResponse } from "next/server"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { getWpEndpoints } from "@/lib/wp-endpoints"
import { stripHtml } from "@/lib/search"
import {
  ALGOLIA_INDEX_PREFIX,
  algoliaAdminClient,
  getAdminIndexHandles,
  type AlgoliaSearchRecord,
} from "@/lib/algolia/client"
import type { SearchIndex } from "algoliasearch"

export const runtime = "nodejs"

const PAGE_SIZE = 100

interface WordPressPost {
  id: number
  slug: string
  date?: string
  date_gmt?: string
  title?: { rendered?: string }
  excerpt?: { rendered?: string }
  _embedded?: {
    "wp:term"?: Array<Array<{ id: number; name?: string }>>
  }
}

const indexingSecret = process.env.ALGOLIA_INDEXING_SECRET || process.env.ALGOLIA_ADMIN_KEY

const normalisePost = (post: WordPressPost, country: string): AlgoliaSearchRecord => {
  const slug = post.slug || String(post.id)
  const categories = (
    post._embedded?.["wp:term"]?.[0]?.map((term) => term.name)?.filter((name): name is string => Boolean(name)) || []
  )

  const title = stripHtml(post.title?.rendered || "").trim()
  const excerpt = stripHtml(post.excerpt?.rendered || "").trim()
  const published = post.date_gmt || post.date || new Date().toISOString()

  return {
    objectID: `${country}:${slug}`,
    title,
    excerpt,
    categories,
    country,
    published_at: new Date(published).toISOString(),
  }
}

async function fetchPostsForCountry(country: string): Promise<WordPressPost[]> {
  const endpoint = getWpEndpoints(country).rest
  const posts: WordPressPost[] = []
  let page = 1

  while (true) {
    const url = `${endpoint}/posts?per_page=${PAGE_SIZE}&page=${page}&_embed=1&orderby=date&order=desc`
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch posts for ${country} (HTTP ${response.status})`)
    }

    const batch: WordPressPost[] = await response.json()
    posts.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return posts
}

const setIndexSettings = async (
  index: SearchIndex<AlgoliaSearchRecord>,
  settings: Record<string, unknown>,
) => {
  const task = await index.setSettings(settings)
  await index.waitTask(task.taskID)
}

async function ensureReplicaSettingsForScope(scope: { type: "country"; country: string } | { type: "panAfrican" }) {
  const handles = getAdminIndexHandles(scope)
  if (!handles) {
    throw new Error("Algolia admin client is not configured")
  }

  await setIndexSettings(handles.base, {
    searchableAttributes: ["title", "excerpt", "categories"],
    attributesForFaceting: ["filterOnly(country)"],
    replicas: [handles.latest.indexName, handles.relevance.indexName],
  })

  await setIndexSettings(handles.latest, {
    ranking: [
      "desc(published_at)",
      "typo",
      "geo",
      "words",
      "proximity",
      "attribute",
      "exact",
      "custom",
    ],
    customRanking: ["desc(published_at)"],
  })

  await setIndexSettings(handles.relevance, {
    ranking: ["typo", "geo", "words", "proximity", "attribute", "exact", "custom"],
    customRanking: [],
  })
}

async function syncCountryIndex(
  country: string,
): Promise<{ country: string; records: number; objects: AlgoliaSearchRecord[] }> {
  const posts = await fetchPostsForCountry(country)
  const records = posts.map((post) => normalisePost(post, country))
  const handles = getAdminIndexHandles({ type: "country", country })

  if (!handles) {
    throw new Error("Algolia admin client is not configured")
  }

  await ensureReplicaSettingsForScope({ type: "country", country })
  const task = await handles.base.replaceAllObjects(records, { safe: true })
  await handles.base.waitTask(task.taskID)

  return { country, records: records.length, objects: records }
}

async function syncPanAfricanIndex(records: AlgoliaSearchRecord[]): Promise<{ index: string; records: number }> {
  const handles = getAdminIndexHandles({ type: "panAfrican" })
  if (!handles) {
    throw new Error("Algolia admin client is not configured")
  }

  await ensureReplicaSettingsForScope({ type: "panAfrican" })
  const task = await handles.base.replaceAllObjects(records, { safe: true })
  await handles.base.waitTask(task.taskID)

  return { index: handles.base.indexName, records: records.length }
}

export async function POST(request: NextRequest) {
  if (!algoliaAdminClient) {
    return NextResponse.json(
      { error: "Algolia admin client is not configured" },
      { status: 500 },
    )
  }

  if (indexingSecret) {
    const provided = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (provided !== indexingSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const panAfricanRecords: AlgoliaSearchRecord[] = []
    const countrySummaries: Array<{ country: string; records: number }> = []

    for (const country of SUPPORTED_COUNTRIES.map((entry) => entry.code)) {
      const summary = await syncCountryIndex(country)
      countrySummaries.push({ country: summary.country, records: summary.records })
      panAfricanRecords.push(...summary.objects)
    }

    const panSummary = await syncPanAfricanIndex(panAfricanRecords)

    return NextResponse.json({
      success: true,
      indexPrefix: ALGOLIA_INDEX_PREFIX,
      countries: countrySummaries,
      panAfrican: panSummary,
    })
  } catch (error) {
    console.error("Algolia indexing failed", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
