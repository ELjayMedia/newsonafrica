import logger from "@/utils/logger"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPostBySlugForCountry, getLatestPostsForCountry } from "@/lib/wordpress-api"
import { ArticleClientContent } from "./ArticleClientContent"
import { ArticleSkeleton } from "./ArticleSkeleton"

export const revalidate = 300 // Revalidate every 5 minutes

type RouteParams = { countryCode: string; slug: string }

type ArticlePageProps = {
  params: RouteParams
  searchParams?: Record<string, string | string[] | undefined>
}

export async function generateStaticParams() {
  logger.log("🚀 Starting generateStaticParams for country articles...")

  const supportedCountries = ["sz", "za"]
  const staticParams: { countryCode: string; slug: string }[] = []
  try {
    await Promise.all(
      supportedCountries.map(async (countryCode) => {
        try {
          logger.log(`📡 Fetching posts for ${countryCode}...`)
          const { posts } = await getLatestPostsForCountry(countryCode, 100)

          const validPosts = posts.filter(
            (post) => post.slug && typeof post.slug === "string",
          )

          validPosts.forEach((post) => {
            staticParams.push({
              countryCode,
              slug: post.slug,
            })
          })

          logger.log(`✅ Added ${validPosts.length} posts for ${countryCode}`)
        } catch (error) {
          logger.error(`❌ Error fetching posts for ${countryCode}:`, error)
        }
      }),
    )

    logger.log(`🎯 Generated ${staticParams.length} static params total`)
    return staticParams
  } catch (error) {
    logger.error("❌ Error in generateStaticParams for articles:", error)
    return []
  }
}

export async function generateMetadata(
  { params }: { params: RouteParams }
): Promise<Metadata> {
  const { countryCode, slug } = params
  logger.log(`🔍 Generating metadata for article: ${countryCode}/${slug}`)

  let post: any
  try {
    post = await getPostBySlugForCountry(countryCode, slug)
  } catch (error) {
    logger.error(`❌ Error generating metadata:`, error)
    return {
      title: "Article - News On Africa",
      description: "Read the latest news from Africa.",
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"}/${countryCode}/article/${slug}`,
      },
    }
  }

  if (!post) {
    return {
      title: "Article Not Found - News On Africa",
      description: "The requested article could not be found.",
      robots: { index: false, follow: false },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"}/${countryCode}/article/${slug}`,
      },
    }
  }

  const rawExcerpt =
    typeof post.excerpt === "string" ? post.excerpt : post.excerpt?.rendered || ""
  const cleanExcerpt = rawExcerpt.replace(/<[^>]*>/g, "").trim()
  const description =
    post.seo?.metaDesc || cleanExcerpt || `Read ${post.title} on News On Africa`
  const featuredImageUrl = post.featuredImage?.node?.sourceUrl || "/default-og-image.jpg"
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"}/${countryCode}/article/${slug}`
  const authorName = post.author?.node?.name ?? "Unknown"

  return {
    title: post.seo?.title || `${post.title} - News On Africa`,
    description,
    authors: [{ name: authorName }],
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonicalUrl,
      siteName: "News On Africa",
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      authors: [authorName],
      images: [{ url: featuredImageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [{ url: featuredImageUrl, alt: post.title }],
    },
  }
}

export default async function Page({ params }: ArticlePageProps) {
  logger.log(`📖 Rendering article: ${params.countryCode}/${params.slug}`)

  let post: any
  try {
    post = await getPostBySlugForCountry(params.countryCode, params.slug)
  } catch (error) {
    logger.error(`❌ Error fetching article:`, error)
    return <ArticleErrorFallback />
  }

  if (!post) {
    logger.warn(`⚠️ Article not found: ${params.countryCode}/${params.slug}`)
    notFound()
  }

  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleWrapper post={post} params={params} />
    </Suspense>
  )
}

function ArticleWrapper({ post, params }: { post: any; params: RouteParams }) {
  const rawExcerpt =
    typeof post.excerpt === "string"
      ? post.excerpt
      : post.excerpt?.rendered || ""
  const authorName = post.author?.node?.name ?? "Unknown"

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: post.title,
            description: rawExcerpt.replace(/<[^>]*>/g, "").trim(),
            image: post.featuredImage?.node?.sourceUrl,
            datePublished: post.date,
            dateModified: post.modified || post.date,
            author: {
              "@type": "Person",
              name: authorName,
            },
            publisher: {
              "@type": "Organization",
              name: "News On Africa",
              logo: {
                "@type": "ImageObject",
                url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"}/news-on-africa-logo.png`,
              },
            },
            mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"}/${params.countryCode}/article/${params.slug}`,
            articleSection: post.categories?.nodes?.[0]?.name || "News",
          }),
        }}
      />

      <ArticleClientContent slug={params.slug} countryCode={params.countryCode} initialData={post} />
    </div>
  )
}

function ArticleErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Article temporarily unavailable</p>
    </div>
  )
}
