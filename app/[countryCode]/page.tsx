import { HomeContent } from "@/components/HomeContent"
import { getLatestPosts, getCategories } from "@/lib/api/wordpress"
import type { Metadata } from "next"

interface CountryPageProps {
  params: { countryCode: string }
}

export const revalidate = 600

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  return {
    title: `News On Africa - ${params.countryCode.toUpperCase()}`,
    description: `Latest news from ${params.countryCode.toUpperCase()}`,
  }
}

async function getHomePageData(code: string) {
  const results = await Promise.allSettled([
    getLatestPosts(50, undefined, code),
    getCategories(code),
  ])
  const latestPostsResult =
    results[0].status === "fulfilled" ? results[0].value : { posts: [] }
  const categoriesResult =
    results[1].status === "fulfilled" ? results[1].value : { categories: [] }
  const posts = latestPostsResult.posts || []
  const categories = categoriesResult.categories || []
  return {
    posts,
    initialData: {
      taggedPosts: posts.filter((p) =>
        p.tags?.nodes?.some((t) => t.slug === "fp" || t.name.toLowerCase() === "fp")
      ),
      featuredPosts: posts.slice(0, 6),
      categories,
      recentPosts: posts.slice(0, 10),
    },
  }
}

export default async function CountryHome({ params }: CountryPageProps) {
  const { countryCode } = params
  const { posts, initialData } = await getHomePageData(countryCode)
  return <HomeContent initialPosts={posts} initialData={initialData} />
}
