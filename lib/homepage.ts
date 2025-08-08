import { getLatestPosts, getCategories } from "@/lib/api/wordpress"
import { categoryConfigs } from "@/config/homeConfig"

export type HomePageResponse = {
  posts: any[]
  initialData: {
    taggedPosts: any[]
    featuredPosts: any[]
    categories: any[]
    recentPosts: any[]
    categoryPosts: Record<string, any[]>
  }
}

export const EMPTY_HOME_PAGE_RESPONSE: HomePageResponse = {
  posts: [],
  initialData: {
    taggedPosts: [],
    featuredPosts: [],
    categories: [],
    recentPosts: [],
    categoryPosts: {},
  },
}

export async function getHomePageData(
  countryCode?: string,
): Promise<HomePageResponse> {
  try {
    const results = await Promise.allSettled([
      getLatestPosts(50, undefined, countryCode),
      getCategories(countryCode),
    ])

    const latestPostsResult =
      results[0].status === "fulfilled" ? results[0].value : { posts: [] }
    const categoriesResult =
      results[1].status === "fulfilled" ? results[1].value : []

    const posts = latestPostsResult.posts || []
    const categories = Array.isArray(categoriesResult)
      ? categoriesResult
      : (categoriesResult as any).categories || []

    const taggedPosts = posts.filter((post: any) =>
      post.tags?.nodes?.some(
        (tag: any) => tag.slug === "fp" || tag.name.toLowerCase() === "fp",
      ),
    )

    const categoryPosts: Record<string, any[]> = {}
    for (const config of categoryConfigs) {
      const slug = config.name.toLowerCase()
      categoryPosts[config.name] = posts
        .filter((post: any) =>
          post.categories?.nodes?.some(
            (cat: any) =>
              cat.slug === slug || cat.name.toLowerCase() === slug,
          ),
        )
        .slice(0, 5)
    }

    return {
      posts,
      initialData: {
        taggedPosts,
        featuredPosts: posts.slice(0, 6),
        categories,
        recentPosts: posts.slice(0, 10),
        categoryPosts,
      },
    }
  } catch (error) {
    console.error("Failed to fetch posts for homepage:", error)
    return EMPTY_HOME_PAGE_RESPONSE
  }
}
