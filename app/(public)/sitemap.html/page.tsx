import type { Metadata } from "next"
import Link from "next/link"

import { fetchCategories, fetchRecentPosts, fetchTags } from "@/lib/wordpress/service"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"

export const runtime = "nodejs"

export const metadata: Metadata = {
  title: "Sitemap | News On Africa",
  description: "Complete sitemap of News On Africa website",
}

type SitemapCategory = {
  slug: string
  name: string
}

type SitemapTag = {
  slug: string
  name: string
}

type SitemapPost = {
  slug: string
  title: string
  date: string
  country?: string | null
}

export default async function SitemapPage() {
  const [categories, tags, recentPosts] = (await Promise.allSettled([
    fetchCategories().catch(() => [] as SitemapCategory[]),
    fetchTags().catch(() => [] as SitemapTag[]),
    fetchRecentPosts(50).catch(() => [] as SitemapPost[]),
  ]).then((results) => [
    results[0].status === "fulfilled" ? (results[0].value as SitemapCategory[]) : ([] as SitemapCategory[]),
    results[1].status === "fulfilled" ? (results[1].value as SitemapTag[]) : ([] as SitemapTag[]),
    results[2].status === "fulfilled" ? (results[2].value as SitemapPost[]) : ([] as SitemapPost[]),
  ])) as [SitemapCategory[], SitemapTag[], SitemapPost[]]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sitemap</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Main Pages</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href={getCategoryUrl("news") as string} className="text-blue-600 hover:underline">
                News
              </Link>
            </li>
            <li>
              <Link href={getCategoryUrl("business") as string} className="text-blue-600 hover:underline">
                Business
              </Link>
            </li>
            <li>
              <Link href={getCategoryUrl("sport") as string} className="text-blue-600 hover:underline">
                Sport
              </Link>
            </li>
            <li>
              <Link href="/search" className="text-blue-600 hover:underline">
                Search
              </Link>
            </li>
            <li>
              <Link href="/subscribe" className="text-blue-600 hover:underline">
                Subscribe
              </Link>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Legal & Info</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">XML Sitemaps</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/sitemap-index.xml" className="text-blue-600 hover:underline">
                Sitemap Index
              </Link>
            </li>
            <li>
              <Link href="/sitemap.xml" className="text-blue-600 hover:underline">
                Main Sitemap
              </Link>
            </li>
          </ul>
        </div>

        <div>
          {categories.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mb-4">Categories</h2>
              <ul className="grid grid-cols-2 gap-2">
                {categories.map((category: SitemapCategory) => (
                  <li key={category.slug}>
                    <Link href={getCategoryUrl(category.slug)} className="text-blue-600 hover:underline">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tags.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-8 mb-4">Popular Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 30).map((tag: SitemapTag) => (
                  <Link
                    key={tag.slug}
                    href={`/tag/${tag.slug}`}
                    className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-sm"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {recentPosts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Recent Articles</h2>
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post: SitemapPost) => (
              <li key={post.slug} className="border-b pb-2">
                <Link href={getArticleUrl(post.slug, post.country ?? undefined)} className="text-blue-600 hover:underline">
                  {post.title}
                </Link>
                <p className="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
