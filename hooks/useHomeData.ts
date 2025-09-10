import { useEffect, useState } from "react"
import useSWR from "swr"
import { getLatestPosts, getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { categoryConfigs } from "@/config/homeConfig"
import type { Post, Category } from "@/types/content"

export interface HomeData {
  taggedPosts: Post[]
  featuredPosts: Post[]
  categories: Category[]
  recentPosts: Post[]
}

const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true
}

const fetchHomeData = async (): Promise<HomeData> => {
  if (!isOnline()) {
    console.log("Device is offline, using cached data")
    throw new Error("Device is offline")
  }

  try {
    const results = await Promise.allSettled([
      getLatestPosts(50),
      getCategories(),
    ])

    const latestPostsResult =
      results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult =
      results[1].status === "fulfilled" ? results[1].value : { categories: [] }

    const posts = latestPostsResult.posts || []
    const categories = categoriesResult.categories || []

    const fpTaggedPosts = posts.filter((post) =>
      post.tags?.nodes?.some((tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp"),
    )

    console.log(
      `Found ${fpTaggedPosts.length} fp-tagged posts out of ${posts.length} total posts`,
    )

    return {
      taggedPosts: fpTaggedPosts,
      featuredPosts: posts.slice(0, 6),
      categories,
      recentPosts: posts.slice(0, 10),
    }
  } catch (error) {
    console.error("Error fetching home data:", error)
    throw error
  }
}

export function useHomeData(
  initialPosts: Post[] = [],
  initialData?: HomeData,
) {
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({})

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const fallbackData: HomeData =
    initialPosts.length > 0
      ? {
          taggedPosts: initialPosts.filter((post) =>
            post.tags?.nodes?.some(
              (tag) => tag.slug === "fp" || tag.name.toLowerCase() === "fp",
            ),
          ),
          featuredPosts: initialPosts.slice(0, 6),
          categories: [],
          recentPosts: initialPosts.slice(0, 10),
        }
      : {
          taggedPosts: [],
          featuredPosts: [],
          categories: [],
          recentPosts: [],
        }

  const { data, error, isLoading } = useSWR<HomeData>(
    "homepage-data",
    fetchHomeData,
    {
      fallbackData: initialData || fallbackData,
      revalidateOnMount: !initialData && !initialPosts.length,
      revalidateOnFocus: false,
      refreshInterval: isOffline ? 0 : 300000,
      dedupingInterval: 60000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (err) => {
        console.error("SWR Error:", err)
        if (!initialData && !initialPosts.length) {
          setIsOffline(true)
        }
      },
      shouldRetryOnError: !isOffline,
    },
  )

  useEffect(() => {
    const fetchCategoryPosts = async () => {
      if (isOffline) return

      const categoryPromises = categoryConfigs.map(async (config) => {
        try {
          const result = await getPostsByCategory(config.name.toLowerCase(), 5)
          return { name: config.name, posts: result.posts || [] }
        } catch (error) {
          console.error(`Error fetching ${config.name} posts:`, error)
          return { name: config.name, posts: [] }
        }
      })

      const results = await Promise.allSettled(categoryPromises)
      const newCategoryPosts: Record<string, Post[]> = {}

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          newCategoryPosts[result.value.name] = result.value.posts
        }
      })

      setCategoryPosts(newCategoryPosts)
    }

    fetchCategoryPosts()
  }, [isOffline])

  return {
    data: data || initialData || fallbackData,
    error,
    isLoading,
    isOffline,
    categoryPosts,
  }
}
