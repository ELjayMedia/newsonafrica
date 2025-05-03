"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { fetchCategoryPosts } from "@/lib/wordpress-api"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"

interface CategoryPostsProps {
  initialPosts: any[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string
  }
  categorySlug: string
}

export default function CategoryPosts({ initialPosts, pageInfo: initialPageInfo, categorySlug }: CategoryPostsProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [pageInfo, setPageInfo] = useState(initialPageInfo)

  const loadMorePosts = useCallback(async () => {
    if (pageInfo.hasNextPage) {
      const data = await fetchCategoryPosts(categorySlug, pageInfo.endCursor)
      if (data && data.posts) {
        setPosts((prevPosts) => [...prevPosts, ...data.posts.nodes])
        setPageInfo(data.posts.pageInfo)
      }
    }
    setIsFetching(false)
  }, [categorySlug, pageInfo.endCursor, pageInfo.hasNextPage])

  const { isFetching, setIsFetching } = useInfiniteScroll(loadMorePosts)

  return (
    <div>
      <div className="space-y-4">
        {posts.map((post: any) => (
          <div key={post.id} className="border rounded-lg overflow-hidden shadow-md">
            <Link
              href={`/post/${post.slug}`}
              className="flex items-start p-3 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="relative w-20 h-20 flex-shrink-0 mr-3">
                <Image
                  src={post.featuredImage?.node?.sourceUrl || "/placeholder.jpg"}
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
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <button className="text-blue-600 hover:text-blue-800">Share</button>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      {isFetching && <p className="text-center mt-4">Loading more posts...</p>}
    </div>
  )
}
