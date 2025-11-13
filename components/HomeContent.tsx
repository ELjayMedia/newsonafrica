import dynamic from "next/dynamic"
import Link from "next/link"

import type { HomeCategorySection, HomeContentPayload } from "@/app/(home)/home-data"
import { SchemaOrg } from "@/components/SchemaOrg"
import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import CountrySpotlight from "@/components/CountrySpotlight"
import { contentMessages } from "@/config/homeConfig"
import { siteConfig } from "@/config/site"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import type { HomePost } from "@/types/home"

const CountryNavigation = dynamic(() => import("@/components/client/CountryNavigation"))
const OfflineBanner = dynamic(() => import("@/components/client/OfflineBanner"))

export interface HomeContentProps extends HomeContentPayload {
  currentCountry: string
}

const buildSchemas = (featuredPosts: HomePost[]) => [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: siteConfig.url,
    name: "News On Africa - Where the Continent Connects",
    description: "A pan-African news platform providing comprehensive coverage across the continent",
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: featuredPosts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.url}${getArticleUrl(post.slug, post.country)}`,
      name: post.title,
    })),
  },
]

const CategorySection = ({ section }: { section: HomeCategorySection }) => {
  const { config, posts, key } = section

  if (posts.length === 0) {
    return null
  }

  const normalizedPosts =
    typeof config.typeOverride === "undefined"
      ? posts
      : posts.map((post) => ({
          ...post,
          type: config.typeOverride,
        }))

  return (
    <section className="bg-white rounded-lg">
      <h2 className="text-lg md:text-xl font-bold capitalize mb-3">
        <Link href={getCategoryUrl(key)} className="hover:text-blue-600 transition-colors">
          {config.name}
        </Link>
      </h2>
      <NewsGrid posts={normalizedPosts} className="compact-grid" />
    </section>
  )
}

export function HomeContent({
  hero,
  secondaryStories,
  featuredPosts,
  categorySections,
  countryPosts,
  currentCountry,
  contentState,
}: HomeContentProps) {
  const schemas = buildSchemas(featuredPosts)

  if (contentState === "empty") {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">{contentMessages.noContent}</h2>
        <p>{contentMessages.noContentDescription}</p>
        <a href="/" className="mt-4 inline-block px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600">
          Refresh Page
        </a>
      </div>
    )
  }

  if (contentState === "awaiting-hero") {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">{contentMessages.noFeaturedPosts}</h2>
        <p>{contentMessages.noFeaturedPostsDescription}</p>
        <a href="/" className="mt-4 inline-block px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600">
          Refresh Page
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 pb-16 md:pb-4">
      <SchemaOrg schemas={schemas} />
      <OfflineBanner />
      <CountryNavigation />

      {hero && (
        <section className="bg-gray-50 px-2 py-2 rounded-lg">
          <FeaturedHero post={hero} />
        </section>
      )}

      <CountrySpotlight countryPosts={countryPosts} currentCountry={currentCountry} />

      {secondaryStories.length > 0 && (
        <section className="bg-white p-2 md:p-3 rounded-lg md:flex md:flex-col">
          <SecondaryStories posts={secondaryStories} layout="horizontal" />
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {categorySections.map((section) => (
          <CategorySection key={section.key} section={section} />
        ))}
      </div>
    </div>
  )
}
