import { fetchCategories, fetchTags, fetchRecentPosts } from "@/lib/wordpress-api"
import Link from "next/link"
import type { Metadata } from "next"
import { getArticleUrl } from "@/lib/utils/routing"

export const metadata: Metadata = {
  title: "Sitemap | News On Africa",
  description: "Complete sitemap of News On Africa website",
}

export default async function SitemapPage() {
  // Fetch data
  const [categories, tags, recentPosts] = await Promise.all([
    fetchCategories(),
    fetchTags(),
    fetchRecentPosts(50), // Get the 50 most recent posts
  ])

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
              <Link href="/news" className="text-blue-600 hover:underline">
                News
              </Link>
            </li>
            <li>
              <Link href="/business" className="text-blue-600 hover:underline">
                Business
              </Link>
            </li>
            <li>
              <Link href="/sport" className="text-blue-600 hover:underline">
                Sport
              </Link>
            </li>
            <li>
              <Link href="/special-projects" className="text-blue-600 hover:underline">
                Special Projects
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
            <li>
              <Link href="/news-sitemap.xml" className="text-blue-600 hover:underline">
                News Sitemap
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Categories</h2>
          <ul className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`} className="text-blue-600 hover:underline">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Popular Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 30).map((tag) => (
              <Link
                key={tag.slug}
                href={`/tag/${tag.slug}`}
                className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-sm"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Recent Articles</h2>
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentPosts.map((post) => (
            <li key={post.slug} className="border-b pb-2">
              <Link
                href={getArticleUrl(post.slug, (post as any)?.country)}
                className="text-blue-600 hover:underline"
              >
                {post.title}
              </Link>
              <p className="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
