import logger from "@/utils/logger"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLatestPosts } from "@/lib/wordpress-api"
import AuthorContent from "./AuthorContent"

interface AuthorPageProps {
  params: { slug: string }
}

export const revalidate = 600 // Revalidate every 10 minutes

// Enhanced metadata generation for author pages
export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  logger.log(`🔍 Generating metadata for author: ${params.slug}`)

  try {
    // Get latest posts to find author information
    const { posts } = await getLatestPosts(100)

    // Find posts by this author
    const authorPosts = posts.filter((post) => post.author.node.slug === params.slug)

    if (authorPosts.length === 0) {
      logger.warn(`⚠️ Author not found: ${params.slug}`)
      return {
        title: "Author Not Found - News On Africa",
        description: "The requested author could not be found.",
        robots: {
          index: false,
          follow: false,
        },
      }
    }

    const author = authorPosts[0].author.node
    logger.log(`✅ Generated metadata for author: "${author.name}"`)

    // Create dynamic description
    const postCount = authorPosts.length
    const description =
      author.description ||
      `Read ${postCount} articles by ${author.name} on News On Africa. ${author.name} covers news and stories from across the African continent.`

    // Get author avatar or featured image from their latest post
    const avatarUrl =
      author.avatar?.url || authorPosts[0]?.featuredImage?.node?.sourceUrl || "/default-author-image.jpg"

    // Create canonical URL
    const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/author/${params.slug}`

    // Generate keywords from author's articles
    const keywords = [
      author.name,
      `${author.name} Articles`,
      "African Journalist",
      "News On Africa",
      ...authorPosts.slice(0, 3).flatMap((post) => post.categories?.nodes?.map((cat) => cat.name) || []),
    ].join(", ")

    return {
      title: `${author.name} - News On Africa`,
      description,
      keywords,
      authors: [{ name: author.name }],

      // Open Graph metadata
      openGraph: {
        type: "profile",
        title: `${author.name} - News On Africa`,
        description,
        url: canonicalUrl,
        siteName: "News On Africa",
        locale: "en_US",
        images: [
          {
            url: avatarUrl,
            width: 400,
            height: 400,
            alt: `${author.name} - Author at News On Africa`,
            type: "image/jpeg",
          },
        ],
      },

      // Twitter metadata
      twitter: {
        card: "summary",
        site: "@newsonafrica",
        title: `${author.name} - News On Africa`,
        description,
        images: [
          {
            url: avatarUrl,
            alt: `${author.name} - Author at News On Africa`,
          },
        ],
      },

      // Additional metadata
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "en-US": canonicalUrl,
        },
      },

      // Robots and indexing
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
      },

      // Additional SEO metadata
      other: {
        "profile:first_name": author.name.split(" ")[0] || "",
        "profile:last_name": author.name.split(" ").slice(1).join(" ") || "",
        "profile:username": author.slug,
        "article:author": author.name,
      },
    }
  } catch (error) {
    logger.error(`❌ Error generating metadata for author ${params.slug}:`, error)
    return {
      title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
      description: `Articles and stories by ${params.slug} on News On Africa`,
      robots: {
        index: false,
        follow: true,
      },
    }
  }
}

// Server component that fetches data and renders the page
export default async function AuthorPage({ params }: AuthorPageProps) {
  try {
    // Get latest posts to find author and their articles
    const { posts } = await getLatestPosts(200)

    // Find posts by this author
    const authorPosts = posts.filter((post) => post.author.node.slug === params.slug)

    if (authorPosts.length === 0) {
      notFound()
    }

    const author = authorPosts[0].author.node

    return <AuthorContent author={author} posts={authorPosts} />
  } catch (error) {
    logger.error(`Error loading author page for ${params.slug}:`, error)
    throw error
  }
}
