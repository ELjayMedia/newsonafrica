"use client"

import useSWR, { type SWRConfiguration } from "swr"
import {
  getLatestPostsForCountry,
  getCategoriesForCountry,
  getFpTaggedPostsForCountry,
  mapPostsToHomePosts,
} from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"
import type { Category } from "@/types/content"

export interface HomeData {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
}

export const HOMEPAGE_DATA_KEY = "/homepage-data"

// Check if we're in a browser environment and if we're online
export const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

export const fetchHomeData = async (country: string): Promise<HomeData> => {
  try {
    if (!isOnline()) {
      throw new Error("Device is offline")
    }

    console.log("[v0] Fetching home data for country:", country)

    const results = await Promise.allSettled([
      getFpTaggedPostsForCountry(country, 8),
      getLatestPostsForCountry(country, 10),
      getCategoriesForCountry(country),
    ])

    const taggedPosts =
      results[0].status === "fulfilled" ? results[0].value : ([] as HomePost[])

    const latestPostsResult =
      results[1].status === "fulfilled" ? results[1].value : { posts: [] as any[] }
    const recentPosts = mapPostsToHomePosts(latestPostsResult.posts ?? [], country)

    const categoriesResult =
      results[2].status === "fulfilled" ? results[2].value : { categories: [] }
    const categories = categoriesResult.categories || []

    const featuredPosts =
      taggedPosts.length > 0 ? taggedPosts.slice(0, 6) : recentPosts.slice(0, 6)

    console.log("[v0] Fetched home data:", {
      taggedPosts: taggedPosts.length,
      recentPosts: recentPosts.length,
      categories: categories.length,
    })

    return {
      taggedPosts,
      featuredPosts,
      categories,
      recentPosts,
    }
  } catch (error) {
    console.error("[v0] Error fetching home data:", error)
    throw error
  }
}

export function useHomeData(
  country: string,
  config?: SWRConfiguration<HomeData, Error, readonly [string, string]>,
) {
  return useSWR<HomeData, Error, readonly [string, string]>(
    [HOMEPAGE_DATA_KEY, country] as const,
    ([, countryCode]) => fetchHomeData(countryCode),
    config,
  )
}
