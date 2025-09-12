import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPostBySlug, getLatestPosts } from "@/lib/api/wordpress"
import { PostClientContent } from "@/components/PostClientContent"
import { PostSkeleton } from "@/components/PostSkeleton"

export const revalidate = 60 // Revalidate every 60 seconds

interface PostPageProps {
  params: { slug: string }
}

// Generate static paths for posts at build time
export async function generateStaticParams() {
  console.log("🚀 Starting generateStaticParams for posts...")
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")

  try {
    console.log("📡 Fetching posts from WordPress API...")
    const startTime = Date.now()

    const result = await circuitBreaker.execute(
      "wordpress-posts-static",
      async () => {
        const { posts, hasNextPage } = await getLatestPosts(1000)
        return { posts, hasNextPage }
      },
      async () => {
        console.log("[v0] Posts static generation: Using fallback due to WordPress unavailability")
        return { posts: [], hasNextPage: false }
      },
    )

    const { posts, hasNextPage } = result
    const fetchTime = Date.now() - startTime
    console.log(`✅ Fetched ${posts.length} posts in ${fetchTime}ms`)
    console.log(`📄 Has more pages: ${hasNextPage}`)

    // Validate posts data
    const validPosts = posts.filter((post) => {
      if (!post.slug) {
        console.warn(`⚠️ Post missing slug: ${post.title || post.id}`)
        return false
      }
      if (typeof post.slug !== "string") {
        console.warn(`⚠️ Invalid slug type for post: ${post.title || post.id}`)
        return false
      }
      return true
    })

    console.log(`✅ ${validPosts.length} valid posts out of ${posts.length} total`)

    if (validPosts.length > 0) {
      console.log("📝 Sample posts being pre-generated:")
      validPosts.slice(0, 5).forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.slug} - "${post.title}"`)
      })

      if (validPosts.length > 5) {
        console.log(`  ... and ${validPosts.length - 5} more posts`)
      }
    }

    // Return array of params for static generation
    const staticParams = validPosts.map((post) => ({
      slug: post.slug,
    }))

    console.log(`🎯 Generating static params for ${staticParams.length} posts`)
    return staticParams
  } catch (error) {
    console.error("❌ Error in generateStaticParams for posts:", error)

    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    // Return empty array to allow fallback generation
    console.log("🔄 Falling back to on-demand generation")
    return []
  }
}

// Enhanced metadata generation with canonical URLs and robots
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  console.log(`🔍 Generating metadata for post: ${params.slug}`)
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = `post-metadata-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  if (cached.exists && !cached.isStale) {
    console.log(`[v0] Post metadata: Using cached data for ${params.slug}`)
    return cached.data
  }

  try {
    const result = await circuitBreaker.execute(
      "wordpress-post-metadata",
      async () => {
        const post = await getPostBySlug(params.slug)

        if (!post) {
          console.warn(`⚠️ Post not found for metadata generation: ${params.slug}`)
          return {
            title: "Article Not Found - News On Africa",
            description: "The requested article could not be found.",
            robots: {
              index: false,
              follow: false,
              noarchive: true,
              nosnippet: true,
            },
            alternates: {
              canonical: `https://newsonafrica.com/post/${params.slug}`,
            },
          }
        }

        console.log(`✅ Generated metadata for: "${post.title}"`)

        // Extract clean text from excerpt for description
        const cleanExcerpt = post.excerpt?.replace(/<[^>]*>/g, "").trim() || ""
        const description = post.seo?.metaDesc || cleanExcerpt || `Read ${post.title} on News On Africa`

        // Get featured image URL
        const featuredImageUrl =
          post.seo?.opengraphImage?.sourceUrl || post.featuredImage?.node?.sourceUrl || "/default-og-image.jpg"

        // Generate keywords from categories and tags
        const keywords = [
          ...(post.categories?.nodes?.map((cat) => cat.name) || []),
          ...(post.tags?.nodes?.map((tag) => tag.name) || []),
          "News On Africa",
          "African News",
          post.author.node.name,
        ].join(", ")

        // Create canonical URL - using the current URL structure
        const canonicalUrl = `https://newsonafrica.com/post/${params.slug}`

        return {
          title: post.seo?.title || `${post.title} - News On Africa`,
          description,
          keywords,
          authors: [
            {
              name: post.author.node.name,
              url: `https://newsonafrica.com/author/${post.author.node.slug}`,
            },
          ],
          creator: post.author.node.name,
          publisher: "News On Africa",
          category: post.categories?.nodes?.[0]?.name || "News",

          // Canonical URL and robots directives
          alternates: {
            canonical: canonicalUrl,
            languages: {
              "en-US": canonicalUrl,
              en: canonicalUrl,
            },
          },

          // Enhanced robots directives
          robots: {
            index: true,
            follow: true,
            nocache: false,
            googleBot: {
              index: true,
              follow: true,
              noimageindex: false,
              "max-video-preview": -1,
              "max-image-preview": "large",
              "max-snippet": -1,
            },
            bingBot: {
              index: true,
              follow: true,
              "max-snippet": -1,
              "max-image-preview": "large",
            },
          },

          // Open Graph metadata
          openGraph: {
            type: "article",
            title: post.seo?.title || post.title,
            description,
            url: canonicalUrl,
            siteName: "News On Africa",
            locale: "en_US",
            publishedTime: post.date,
            modifiedTime: post.modified || post.date,
            expirationTime: undefined, // Articles don't expire
            authors: [post.author.node.name],
            section: post.categories?.nodes?.[0]?.name || "News",
            tags: post.tags?.nodes?.map((tag) => tag.name) || [],
            images: [
              {
                url: featuredImageUrl,
                width: 1200,
                height: 630,
                alt: post.featuredImage?.node?.altText || post.title,
                type: "image/jpeg",
              },
              // Add additional image sizes for better social sharing
              {
                url: featuredImageUrl,
                width: 800,
                height: 600,
                alt: post.featuredImage?.node?.altText || post.title,
                type: "image/jpeg",
              },
            ],
          },

          // Twitter metadata
          twitter: {
            card: "summary_large_image",
            site: "@newsonafrica",
            creator: `@${post.author.node.slug}`,
            title: post.seo?.title || post.title,
            description,
            images: [
              {
                url: featuredImageUrl,
                alt: post.featuredImage?.node?.altText || post.title,
              },
            ],
          },

          // Additional SEO metadata
          other: {
            "article:author": post.author.node.name,
            "article:published_time": post.date,
            "article:modified_time": post.modified || post.date,
            "article:section": post.categories?.nodes?.[0]?.name || "News",
            "article:tag": post.tags?.nodes?.map((tag) => tag.name).join(", ") || "",
            "og:site_name": "News On Africa",
            "og:locale": "en_US",
          },
        }
      },
      async () => {
        if (cached.exists) {
          console.log(`[v0] Post metadata: Using stale cache for ${params.slug}`)
          return cached.data
        }

        console.log(`[v0] Post metadata: Using fallback for ${params.slug}`)
        return {
          title: "Article - News On Africa",
          description: "Read the latest news and articles from across Africa.",
          robots: {
            index: false,
            follow: true,
          },
          alternates: {
            canonical: `https://newsonafrica.com/post/${params.slug}`,
          },
        }
      },
    )

    enhancedCache.set(cacheKey, result, 600000, 1800000) // 10min fresh, 30min stale
    return result
  } catch (error) {
    console.error(`❌ Error generating metadata for post ${params.slug}:`, error)

    if (cached.exists) {
      return cached.data
    }

    return {
      title: "Article - News On Africa",
      description: "Read the latest news and articles from across Africa.",
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `https://newsonafrica.com/post/${params.slug}`,
      },
    }
  }
}

// Main post page component
export default async function PostPage({ params }: PostPageProps) {
  console.log(`📖 Rendering post page: ${params.slug}`)
  const { circuitBreaker } = await import("@/lib/api/circuit-breaker")
  const { enhancedCache } = await import("@/lib/cache/enhanced-cache")

  const cacheKey = `post-data-${params.slug}`
  const cached = enhancedCache.get(cacheKey)

  try {
    const startTime = Date.now()

    const post = await circuitBreaker.execute(
      "wordpress-post-data",
      async () => {
        const postData = await getPostBySlug(params.slug)

        if (!postData) {
          console.warn(`⚠️ Post not found: ${params.slug}`)
          notFound()
        }

        return postData
      },
      async () => {
        if (cached.exists) {
          console.log(`[v0] Post data: Using stale cache for ${params.slug}`)
          return cached.data
        }

        console.log(`[v0] Post data: Using fallback for ${params.slug}`)
        return {
          id: "fallback-post",
          title: "Article Temporarily Unavailable",
          content: "<p>We're experiencing temporary issues loading this article. Please try again shortly.</p>",
          excerpt: "Article temporarily unavailable due to technical issues.",
          slug: params.slug,
          date: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: { node: { name: "News On Africa", slug: "news-team" } },
          categories: { nodes: [{ name: "System", slug: "system" }] },
          tags: { nodes: [] },
          featuredImage: { node: { sourceUrl: "/article-placeholder.png", altText: "Article unavailable" } },
        }
      },
    )

    const fetchTime = Date.now() - startTime

    if (post && !cached.isStale) {
      enhancedCache.set(cacheKey, post, 300000, 900000) // 5min fresh, 15min stale
    }

    console.log(`✅ Post data fetched in ${fetchTime}ms: "${post.title}"`)

    return (
      <Suspense fallback={<PostSkeleton />}>
        <PostWrapper post={post} slug={params.slug} />
      </Suspense>
    )
  } catch (error) {
    console.error(`❌ Error fetching post ${params.slug}:`, error)

    if (cached.exists) {
      console.log(`[v0] Post page: Using cached data due to error for ${params.slug}`)
      return (
        <Suspense fallback={<PostSkeleton />}>
          <PostWrapper post={cached.data} slug={params.slug} />
        </Suspense>
      )
    }

    // Let error boundary handle this
    throw error
  }
}

// Wrapper component to handle post rendering
function PostWrapper({ post, slug }: { post: any; slug: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Additional head elements for enhanced SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: post.title,
            description: post.excerpt?.replace(/<[^>]*>/g, "").trim(),
            image: {
              "@type": "ImageObject",
              url: post.featuredImage?.node?.sourceUrl,
              width: 1200,
              height: 630,
            },
            datePublished: post.date,
            dateModified: post.modified || post.date,
            author: {
              "@type": "Person",
              name: post.author.node.name,
              url: `https://newsonafrica.com/author/${post.author.node.slug}`,
            },
            publisher: {
              "@type": "Organization",
              name: "News On Africa",
              logo: {
                "@type": "ImageObject",
                url: "https://newsonafrica.com/news-on-africa-logo.png",
                width: 200,
                height: 60,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://newsonafrica.com/post/${slug}`,
            },
            articleSection: post.categories?.nodes?.[0]?.name || "News",
            keywords: [
              ...(post.categories?.nodes?.map((cat: any) => cat.name) || []),
              ...(post.tags?.nodes?.map((tag: any) => tag.name) || []),
            ].join(", "),
            wordCount: post.content?.replace(/<[^>]*>/g, "").split(" ").length || 0,
            inLanguage: "en-US",
            url: `https://newsonafrica.com/post/${slug}`,
          }),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://newsonafrica.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: post.categories?.nodes?.[0]?.name || "News",
                item: `https://newsonafrica.com/category/${post.categories?.nodes?.[0]?.slug || "news"}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: `https://newsonafrica.com/post/${slug}`,
              },
            ],
          }),
        }}
      />

      <PostClientContent slug={slug} initialData={post} />
    </div>
  )
}
