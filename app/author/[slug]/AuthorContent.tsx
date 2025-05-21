"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { fetchAuthorData } from "@/lib/wordpress-api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getBreadcrumbSchema, getWebPageSchema } from "@/lib/schema"
import { siteConfig } from "@/config/site"
import ErrorBoundary from "@/components/ErrorBoundary"
import { formatDate } from "@/lib/utils"

interface AuthorContentProps {
  initialData: any
  slug: string
}

export function AuthorContent({ initialData, slug }: AuthorContentProps) {
  const { ref, inView } = useInView()

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ["author", slug],
    queryFn: ({ pageParam = null }) => fetchAuthorData(slug, pageParam),
    getNextPageParam: (lastPage) => lastPage?.posts.pageInfo.endCursor ?? undefined,
    initialData: initialData ? { pages: [initialData], pageParams: [null] } : undefined,
    initialPageParam: null,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (status === "loading") return <AuthorSkeleton />
  if (status === "error") return <div>Error: {(error as Error).message}</div>

  if (!data || !data.pages[0]) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Author not found</h2>
        <p className="text-gray-600">
          We couldn't find an author with this name. They may have been removed or renamed.
        </p>
      </div>
    )
  }

  const author = data.pages[0]
  const posts = data.pages.flatMap((page) => page?.posts.nodes ?? [])

  // Create the full URL for the author page
  const authorUrl = `${siteConfig.url}/author/${slug}`

  // Generate schema.org structured data
  const schemas = [
    // Person schema for the author
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${authorUrl}#person`,
      name: author.name,
      description: author.description || "",
      url: authorUrl,
      image: author.avatar?.url || "",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${siteConfig.url}/#organization`,
      },
    },

    // BreadcrumbList schema
    getBreadcrumbSchema([
      { name: "Home", url: siteConfig.url },
      { name: "Authors", url: `${siteConfig.url}/authors` },
      { name: author.name, url: authorUrl },
    ]),

    // WebPage schema
    getWebPageSchema(authorUrl, `${author.name} - News On Africa`, author.description || `Articles by ${author.name}`),
  ]

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto px-4 py-8">
        <SchemaOrg schemas={schemas} />
        <div className="flex items-center mb-8">
          <div className="mr-6">
            <Image
              src={author.avatar?.url || "/placeholder.svg?height=100&width=100&query=avatar"}
              alt={author.name}
              width={100}
              height={100}
              className="rounded-full"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
            {author.description && <p className="text-gray-600">{author.description}</p>}
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Articles by {author.name}</h2>

        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border rounded-lg overflow-hidden shadow-md">
                <Link
                  href={`/post/${post.slug}`}
                  className="flex items-start p-3 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="relative w-20 h-20 flex-shrink-0 mr-3">
                    <Image
                      src={post.featuredImage?.node?.sourceUrl || "/placeholder.svg?height=80&width=80&query=article"}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <h2 className="text-sm font-semibold leading-tight">{post.title}</h2>
                    <div className="flex justify-between text-xs mt-2">
                      <p className="text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(post.date)}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p>No articles found for this author.</p>
        )}

        <div ref={ref} className="mt-8 text-center">
          {isFetchingNextPage ? (
            <div>Loading more...</div>
          ) : hasNextPage ? (
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              Load More
            </Button>
          ) : (
            <div>No more articles</div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

function AuthorSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full mr-6" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start border rounded-lg p-3">
            <Skeleton className="w-20 h-20 rounded-lg mr-3" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
