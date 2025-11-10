import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ENV } from "@/config/env"
import * as log from "@/lib/log"
import { getAuthorBySlug } from "@/lib/wp-server/authors"
import { mapWpPostsToPostListItems } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import AuthorContent from "./AuthorContent"

interface AuthorPageProps {
  params: { slug: string }
}

export const runtime = "nodejs"
export const revalidate = 3600 // Revalidate the page once per hour (3600 seconds)

// Enhanced metadata generation for author pages
export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  log.info(`🔍 Generating metadata for author: ${params.slug}`)

  try {
    const authorData = await getAuthorBySlug(params.slug, { postLimit: 12 })

    if (!authorData || authorData.posts.length === 0) {
      log.warn(`⚠️ Author not found: ${params.slug}`)
      return {
        title: "Author Not Found - News On Africa",
        description: "The requested author could not be found.",
        robots: {
          index: false,
          follow: false,
        },
      }
    }

    const { author, posts } = authorData
    log.info(`✅ Generated metadata for author: "${author.name}"`)

    // Create dynamic description
    const postCount = posts.length
    const description =
      author.description ||
      `Read ${postCount} articles by ${author.name} on News On Africa. ${author.name} covers news and stories from across the African continent.`

    // Get author avatar or featured image from their latest post
    const avatarUrl = author.avatar?.url || posts[0]?.featuredImage?.node?.sourceUrl || "/default-author-image.jpg"

    // Create canonical URL
    const canonicalUrl = `${ENV.NEXT_PUBLIC_SITE_URL}/author/${params.slug}`

    // Generate keywords from author's articles
    const keywords = [
      author.name,
      `${author.name} Articles`,
      "African Journalist",
      "News On Africa",
      ...posts.slice(0, 3).flatMap((post) => post.categories?.nodes?.map((cat) => cat.name) || []),
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
    log.error(`❌ Error generating metadata for author ${params.slug}`, { error })
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
    const authorData = await getAuthorBySlug(params.slug, { postLimit: 20 })

    if (!authorData || authorData.posts.length === 0) {
      notFound()
    }

    const { author, posts } = authorData
    const mappedPosts = mapWpPostsToPostListItems(posts, DEFAULT_COUNTRY)

    return <AuthorContent author={author} posts={mappedPosts} />
  } catch (error) {
    log.error(`Error loading author page for ${params.slug}`, { error })
    throw error
  }
}
