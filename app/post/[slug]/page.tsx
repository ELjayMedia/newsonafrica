import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPostBySlug, getAllPostSlugs } from "@/lib/api/wordpress"
import logger from "@/utils/logger"
import { PostClientContent } from "./PostClientContent"
import { PostSkeleton } from "@/components/PostSkeleton"

export const revalidate = 300 // Revalidate every 5 minutes

interface PostPageProps {
  params: { slug: string }
}

// Generate static paths for posts at build time
export async function generateStaticParams() {
  logger("🚀 Starting generateStaticParams for posts...")

  try {
    // Get post slugs for static generation
    logger("📡 Fetching post slugs from WordPress API...")
    const startTime = Date.now()

    const { slugs, hasNextPage } = await getAllPostSlugs(500)

    const fetchTime = Date.now() - startTime
    logger(`✅ Fetched ${slugs.length} slugs in ${fetchTime}ms`)
    logger(`📄 Has more pages: ${hasNextPage}`)

    // Validate slug data
    const validSlugs = slugs.filter((item) => {
      if (!item.slug || typeof item.slug !== "string") {
        console.warn(`⚠️ Invalid slug: ${item.slug}`)
        return false
      }
      return true
    })

    logger(`✅ ${validSlugs.length} valid slugs out of ${slugs.length} total`)

    // Log sample of slugs being generated
    if (validSlugs.length > 0) {
      logger("📝 Sample slugs being pre-generated:")
      validSlugs.slice(0, 5).forEach((item, index) => {
        logger(`  ${index + 1}. ${item.slug}`)
      })

      if (validSlugs.length > 5) {
        logger(`  ... and ${validSlugs.length - 5} more slugs`)
      }
    }

    // Return array of params for static generation
    const staticParams = validSlugs.map((item) => ({
      slug: item.slug,
    }))

    logger(`🎯 Generating static params for ${staticParams.length} posts`)
    return staticParams
  } catch (error) {
    console.error("❌ Error in generateStaticParams for posts:", error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    // Return empty array to allow fallback generation
    logger("🔄 Falling back to on-demand generation")
    return []
  }
}

// Enhanced metadata generation with canonical URLs and robots
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  logger(`🔍 Generating metadata for post: ${params.slug}`)

  try {
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

    logger(`✅ Generated metadata for: "${post.title}"`)

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
  } catch (error) {
    console.error(`❌ Error generating metadata for post ${params.slug}:`, error)
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
  logger(`📖 Rendering post page: ${params.slug}`)

  try {
    // Fetch post data server-side
    const startTime = Date.now()
    const post = await getPostBySlug(params.slug)
    const fetchTime = Date.now() - startTime

    if (!post) {
      console.warn(`⚠️ Post not found: ${params.slug}`)
      notFound()
    }

    logger(`✅ Post data fetched in ${fetchTime}ms: "${post.title}"`)

    return (
      <Suspense fallback={<PostSkeleton />}>
        <PostWrapper post={post} slug={params.slug} />
      </Suspense>
    )
  } catch (error) {
    console.error(`❌ Error fetching post ${params.slug}:`, error)
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
