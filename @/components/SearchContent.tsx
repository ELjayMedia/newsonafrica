"use client"

import { useRef, useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { searchPosts } from "@/lib/wordpress-api"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"
import { SearchForm } from "@/components/SearchForm"
import { HorizontalCard } from "@/components/HorizontalCard"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { Button } from "@/components/ui/button"

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const router = useRouter()

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ["search", query],
    queryFn: async ({ pageParam = null }) => {
      const result = await searchPosts(query, pageParam)
      return result
    },
    getNextPageParam: (lastPage) => lastPage.pageInfo?.endCursor,
    enabled: !!query,
    initialPageParam: null,
  })

  const { setIsFetching } = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  })

  useEffect(() => {
    // Scroll to top when the search query changes
    window.scrollTo(0, 0)
  }, [])

  if (isLoading) return <NewsGridSkeleton />
  if (error) return <div className="text-center text-red-500">An error occurred while fetching results.</div>

  const allPosts = data?.pages.flatMap((page) => page.nodes) || []

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <SearchForm initialQuery={query} />
      </div>
      <section className="bg-white p-4 rounded-lg shadow-sm">
        {allPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allPosts.map((post) => (
                <HorizontalCard key={post.id} post={post} />
              ))}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="mt-4 text-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading more..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center">No results found for "{query}"</p>
        )}
      </section>
    </div>
  )
}
