import { createClient } from "@/utils/supabase/server"
import type { SearchRecord } from "@/types/search"

export interface SupabaseSearchResult {
  id: string
  edition_code: string
  wp_post_id: number
  slug: string
  title: string
  excerpt: string | null
  tags: string[]
  categories: string[]
  author: string | null
  published_at: string
  url_path: string
  featured_image_url: string | null
  rank?: number
}

export interface SearchOptions {
  edition?: string
  category?: string
  page?: number
  perPage?: number
}

export interface SearchResponse {
  results: SearchRecord[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  suggestions: string[]
}

function mapToSearchRecord(result: SupabaseSearchResult): SearchRecord {
  return {
    objectID: `${result.edition_code}:${result.slug}`,
    title: result.title,
    excerpt: result.excerpt || "",
    categories: result.categories,
    country: result.edition_code,
    published_at: result.published_at,
  }
}

export async function searchContent(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const { edition, category, page = 1, perPage = 20 } = options
  const offset = (page - 1) * perPage

  const supabase = await createClient()

  // Call the search function
  const { data, error } = await supabase.rpc("search_content", {
    search_query: query,
    edition_filter: edition || null,
    category_filter: category || null,
    limit_count: perPage,
    offset_count: offset,
  })

  if (error) {
    console.error("[v0] Supabase search error:", error)
    return {
      results: [],
      total: 0,
      totalPages: 0,
      currentPage: page,
      hasMore: false,
      suggestions: [],
    }
  }

  const results = (data || []) as SupabaseSearchResult[]
  const mappedResults = results.map(mapToSearchRecord)

  // Get total count for pagination
  let total = results.length
  if (results.length === perPage) {
    const { count } = await supabase
      .from("content_index")
      .select("*", { count: "exact", head: true })
      .textSearch("search_vector", query)
      .eq(edition ? "edition_code" : "", edition || "")

    total = count || results.length
  }

  const totalPages = Math.ceil(total / perPage)

  return {
    results: mappedResults,
    total,
    totalPages: Math.max(1, totalPages),
    currentPage: page,
    hasMore: page < totalPages,
    suggestions: Array.from(new Set(mappedResults.map((r) => r.title))).slice(0, 10),
  }
}

export async function getSearchSuggestions(query: string, edition?: string, limit = 10): Promise<string[]> {
  if (query.length < 2) {
    return []
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc("search_suggestions", {
    search_query: query,
    edition_filter: edition || null,
    limit_count: limit,
  })

  if (error) {
    console.error("[v0] Supabase suggestions error:", error)
    return []
  }

  return (data || []).map((item: { title: string }) => item.title)
}

export async function syncPostToIndex(post: {
  edition_code: string
  wp_post_id: number
  slug: string
  title: string
  excerpt?: string
  content_plain?: string
  tags?: string[]
  categories?: string[]
  author?: string
  published_at: string
  url_path: string
  featured_image_url?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from("content_index").upsert(
    {
      edition_code: post.edition_code,
      wp_post_id: post.wp_post_id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || null,
      content_plain: post.content_plain || null,
      tags: post.tags || [],
      categories: post.categories || [],
      author: post.author || null,
      published_at: post.published_at,
      url_path: post.url_path,
      featured_image_url: post.featured_image_url || null,
    },
    {
      onConflict: "edition_code,wp_post_id",
    },
  )

  if (error) {
    console.error("[v0] Sync post to index error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deletePostFromIndex(
  edition_code: string,
  wp_post_id: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from("content_index").delete().match({ edition_code, wp_post_id })

  if (error) {
    console.error("[v0] Delete post from index error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
