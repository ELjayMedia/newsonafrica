import "server-only"

import {
  fetchPost,
  getCategoriesForCountry,
  getFeaturedPosts,
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
  getRelatedPostsForCountry,
} from "@/lib/wordpress-api"

import { DEFAULT_COUNTRY, mapPostsToHomePosts } from "@/lib/wordpress/shared"

export async function loadLatestPostsForCountry(countryCode: string, limit = 20) {
  return getLatestPostsForCountry(countryCode, limit)
}

export async function loadLatestHomePostsForCountry(countryCode: string, limit = 20) {
  const result = await getLatestPostsForCountry(countryCode, limit)

  return {
    posts: mapPostsToHomePosts(result.posts ?? [], countryCode),
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  }
}

export async function loadCategoryPostsForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
) {
  return getPostsByCategoryForCountry(countryCode, categorySlug, limit)
}

export async function loadCategoryHomePostsForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
) {
  const result = await getPostsByCategoryForCountry(countryCode, categorySlug, limit)

  return {
    category: result.category ?? null,
    posts: mapPostsToHomePosts(result.posts ?? [], countryCode),
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  }
}

export async function loadCategoriesForCountry(countryCode: string) {
  return getCategoriesForCountry(countryCode)
}

export async function loadFeaturedPosts(limit = 10) {
  return getFeaturedPosts(DEFAULT_COUNTRY, limit)
}

export async function loadFeaturedHomePosts(limit = 10) {
  const posts = await getFeaturedPosts(DEFAULT_COUNTRY, limit)
  return mapPostsToHomePosts(posts ?? [], process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY)
}

export async function loadPost(countryCode: string, slug: string) {
  return fetchPost({ countryCode, slug })
}

export async function loadRelatedPostsForCountry(countryCode: string, postId: string, limit = 6) {
  return getRelatedPostsForCountry(countryCode, postId, limit)
}

export async function loadRelatedHomePostsForCountry(
  countryCode: string,
  postId: string,
  limit = 6,
) {
  const posts = await getRelatedPostsForCountry(countryCode, postId, limit)
  return mapPostsToHomePosts(posts ?? [], countryCode)
}
