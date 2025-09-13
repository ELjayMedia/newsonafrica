import logger from '@/utils/logger'
"use client"

import { useCallback } from "react"

import { useState } from "react"

import { graphqlRequest, restApiFallback, fetchWithMultipleCountryFallback } from "./wordpress"
import type { WordPressPost } from "./wordpress"

export interface SearchResult {
  posts: WordPressPost[]
  totalResults: number
  hasNextPage: boolean
  endCursor: string | null
}

const SEARCH_POSTS_QUERY = `
  query SearchPosts($search: String!, $first: Int, $after: String) {
    posts(
      where: { search: $search }
      first: $first
      after: $after
    ) {
      nodes {
        id
        title
        excerpt
        slug
        date
        modified
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        author {
          node {
            id
            name
            slug
            avatar {
              url
            }
          }
        }
        categories {
          nodes {
            id
            name
            slug
          }
        }
        tags {
          nodes {
            id
            name
            slug
          }
        }
        seo {
          title
          metaDesc
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export async function searchPosts(
  query: string,
  countryCode: string,
  limit = 20,
  after?: string,
): Promise<SearchResult> {
  return fetchWithMultipleCountryFallback(countryCode, async (country) => {
    try {
      const data = await graphqlRequest<{
        posts: {
          nodes: WordPressPost[]
          pageInfo: {
            hasNextPage: boolean
            endCursor: string | null
          }
        }
      }>(
        SEARCH_POSTS_QUERY,
        {
          search: query,
          first: limit,
          after,
        },
        country,
      )

      return {
        posts: data.posts.nodes,
        totalResults: data.posts.nodes.length,
        hasNextPage: data.posts.pageInfo.hasNextPage,
        endCursor: data.posts.pageInfo.endCursor,
      }
    } catch (error) {
      logger.error(`Search failed for "${query}" in ${country} via GraphQL, trying REST API:`, error)

      try {
        const posts = await restApiFallback(
          "posts",
          { search: query, per_page: limit, _embed: 1 },
          (posts: any[]) =>
            posts.map((post: any) => ({
              id: post.id.toString(),
              title: post.title.rendered,
              excerpt: post.excerpt.rendered,
              slug: post.slug,
              date: post.date,
              modified: post.modified,
              featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : undefined,
              author: {
                node: {
                  id: post._embedded?.["wp:author"]?.[0]?.id?.toString() || "",
                  name: post._embedded?.["wp:author"]?.[0]?.name || "Unknown",
                  slug: post._embedded?.["wp:author"]?.[0]?.slug || "",
                },
              },
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    id: cat.id.toString(),
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
              tags: {
                nodes:
                  post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                    id: tag.id.toString(),
                    name: tag.name,
                    slug: tag.slug,
                  })) || [],
              },
            })),
          country,
        )

        return {
          posts,
          totalResults: posts.length,
          hasNextPage: posts.length === limit,
          endCursor: null,
        }
      } catch (restError) {
        logger.error("Both GraphQL and REST search failed:", restError)
        return {
          posts: [],
          totalResults: 0,
          hasNextPage: false,
          endCursor: null,
        }
      }
    }
  })
}

export function useSearch(countryCode: string) {
  const [results, setResults] = useState<SearchResult>({
    posts: [],
    totalResults: 0,
    hasNextPage: false,
    endCursor: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const search = useCallback(
    async (query: string, limit = 20) => {
      if (!query.trim()) {
        setResults({ posts: [], totalResults: 0, hasNextPage: false, endCursor: null })
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await searchPosts(query, countryCode, limit)
        setResults(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"))
        setResults({ posts: [], totalResults: 0, hasNextPage: false, endCursor: null })
      } finally {
        setIsLoading(false)
      }
    },
    [countryCode],
  )

  const loadMore = useCallback(
    async (query: string) => {
      if (!results.hasNextPage || isLoading) return

      setIsLoading(true)
      try {
        const moreResults = await searchPosts(query, countryCode, 20, results.endCursor || undefined)
        setResults((prev) => ({
          posts: [...prev.posts, ...moreResults.posts],
          totalResults: prev.totalResults + moreResults.totalResults,
          hasNextPage: moreResults.hasNextPage,
          endCursor: moreResults.endCursor,
        }))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load more results"))
      } finally {
        setIsLoading(false)
      }
    },
    [countryCode, results.hasNextPage, results.endCursor, isLoading],
  )

  return {
    results,
    isLoading,
    error,
    search,
    loadMore,
  }
}
