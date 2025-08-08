import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCategories, getPostsByCategory } from "@/lib/api/wordpress"
import { CategoryPage } from "./CategoryPage"

interface CategoryPageProps {
  params: { countryCode: string; slug: string }
}

// Static generation configuration
export const revalidate = 600 // Revalidate every 10 minutes
export const dynamicParams = true // Allow dynamic params not in generateStaticParams

// Generate static paths for all categories
export async function generateStaticParams() {
  try {
    const codes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES || "")
      .split(",")
      .filter(Boolean)

    const categoriesByCode = await Promise.all(
      codes.map((code) =>
        getCategories(code)
          .then((categories) => ({ code, categories }))
          .catch((err) => {
            console.error(`Error fetching categories for ${code}:`, err)
            return { code, categories: [] }
          }),
      ),
    )

    const params = categoriesByCode.flatMap(({ code, categories }) =>
      categories.slice(0, 50).map((category) => ({ countryCode: code, slug: category.slug })),
    )

    return params
  } catch (error) {
    console.error("Error generating static params for categories:", error)
    // Return empty array to allow all pages to be generated on-demand
    return []
  }
}

// Enhanced metadata generation for categories with canonical URLs and robots
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  console.log(`🔍 Generating metadata for category: ${params.slug} in ${params.countryCode}`)

  try {
    const { category, posts } = await getPostsByCategory(
      params.slug,
      10,
      undefined,
      params.countryCode,
    )

    // Use the resolved slug for canonical URLs
    const canonicalSlug = category?.slug || params.slug

    if (!category) {
      console.warn(`⚠️ Category not found for metadata generation: ${params.slug}`)
      return {
        title: "Category Not Found - News On Africa",
        description: "The requested category could not be found.",
        robots: {
          index: false,
          follow: false,
          noarchive: true,
        },
        alternates: {
          canonical: `https://newsonafrica.com/${params.countryCode}/category/${params.slug}`,
        },
      }
    }

    console.log(`✅ Generated metadata for category: "${category.name}"`)

    // Create dynamic description
    const baseDescription = category.description || `Latest articles in the ${category.name} category`
    const postCount = category.count || posts.length
    const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`

    // Get featured image from the first post with an image
    const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl)
    const featuredImageUrl = featuredPost?.featuredImage?.node?.sourceUrl || "/default-category-image.jpg"

    // Create canonical URL
    const canonicalUrl = `https://newsonafrica.com/${params.countryCode}/category/${canonicalSlug}`

    // Generate keywords
    const keywords = [
      category.name,
      `${category.name} News`,
      "African News",
      "News On Africa",
      ...posts.slice(0, 5).map((post) => post.title.split(" ").slice(0, 3).join(" ")),
    ].join(", ")

    return {
      title: `${category.name} News - News On Africa`,
      description,
      keywords,
      category: category.name,

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
        type: "website",
        title: `${category.name} - News On Africa`,
        description,
        url: canonicalUrl,
        siteName: "News On Africa",
        locale: "en_US",
        images: [
          {
            url: featuredImageUrl,
            width: 1200,
            height: 630,
            alt: `${category.name} news from News On Africa`,
            type: "image/jpeg",
          },
          {
            url: featuredImageUrl,
            width: 800,
            height: 600,
            alt: `${category.name} news from News On Africa`,
            type: "image/jpeg",
          },
        ],
      },

      // Twitter metadata
      twitter: {
        card: "summary_large_image",
        site: "@newsonafrica",
        title: `${category.name} - News On Africa`,
        description,
        images: [
          {
            url: featuredImageUrl,
            alt: `${category.name} news from News On Africa`,
          },
        ],
      },

      // Additional SEO metadata
      other: {
        "article:section": category.name,
        "article:tag": category.name,
        "og:updated_time": new Date().toISOString(),
        "og:site_name": "News On Africa",
        "og:locale": "en_US",
      },
    }
  } catch (error) {
    console.error(`❌ Error generating metadata for category ${params.slug}:`, error)
    return {
      title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - News On Africa`,
      description: `Latest articles in the ${params.slug} category from News On Africa`,
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `https://newsonafrica.com/${params.countryCode}/category/${params.slug}`,
      },
    }
  }
}

// Server component that fetches data and renders the page
export default async function CategoryServerPage({ params }: CategoryPageProps) {
  try {
    // Fetch category data and initial posts
    const categoryData = await getPostsByCategory(
      params.slug,
      20,
      undefined,
      params.countryCode,
    )

    // Redirect to the canonical slug if it differs from the requested one
    if (categoryData.category && categoryData.category.slug !== params.slug) {
      redirect(`/${params.countryCode}/category/${categoryData.category.slug}`)
    }

    // If category doesn't exist, show 404
    if (!categoryData.category) {
      notFound()
    }

    // Pass the fetched data to the client component
    return (
      <CategoryPage
        slug={params.slug}
        countryCode={params.countryCode}
        initialData={categoryData}
      />
    )
  } catch (error) {
    console.error(`Error loading category page for ${params.slug}:`, error)

    // For build-time errors, still try to render with empty data
    // The client component will handle the error state
    return <CategoryPage slug={params.slug} countryCode={params.countryCode} initialData={null} />
  }
}
