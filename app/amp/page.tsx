import { fetchFeaturedPosts, fetchCategorizedPosts, fetchTaggedPosts } from "@/lib/wordpress-api"
import { AMPFeaturedHero } from "@/components/amp/AMPFeaturedHero"
import { AMPSecondaryStories } from "@/components/amp/AMPSecondaryStories"
import { AMPNewsGrid } from "@/components/amp/AMPNewsGrid"
import Link from "next/link"

export const runtime = "edge"

export default async function AMPHomePage() {
  const [taggedPosts, featuredPosts, categories] = await Promise.all([
    fetchTaggedPosts("fp", 1),
    fetchFeaturedPosts(),
    fetchCategorizedPosts(),
  ])

  const mainStory = taggedPosts?.[0] || featuredPosts?.[0]
  const secondaryStories = featuredPosts?.slice(1, 4) || []

  const getPostsForCategoryAndChildren = (categoryName: string, allCategories) => {
    const category = allCategories.find((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())
    if (!category) return []

    const childCategories = allCategories.filter(
      (cat) => cat.parent?.node?.name.toLowerCase() === categoryName.toLowerCase(),
    )

    const allPosts = [...(category.posts?.nodes || []), ...childCategories.flatMap((child) => child.posts?.nodes || [])]

    return Array.from(new Set(allPosts.map((post) => post.id)))
      .map((id) => allPosts.find((post) => post.id === id))
      .filter((post) => !post.tags?.nodes.some((tag) => tag.slug === "fp"))
      .slice(0, 5)
  }

  return (
    <>
      <div className="space-y-8">
        <section className="bg-gray-50 px-4 py-2 rounded-lg shadow-sm">
          {mainStory && <AMPFeaturedHero post={mainStory} />}
        </section>

        <section className="bg-white p-4 rounded-lg shadow-sm md:flex md:flex-col">
          {secondaryStories.length > 0 && <AMPSecondaryStories posts={secondaryStories} layout="horizontal" />}
        </section>

        <div className="grid grid-cols-1 gap-8">
          {["news", "business", "life", "sport", "editorial"].map((categoryName) => {
            const postsForCategory = categories ? getPostsForCategoryAndChildren(categoryName, categories) : []
            if (postsForCategory.length === 0) return null

            return (
              <section key={categoryName} className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4 capitalize">
                  <Link
                    href={`/category/${categoryName.toLowerCase()}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {categoryName}
                  </Link>
                </h2>
                <AMPNewsGrid
                  posts={postsForCategory.map((post) => ({
                    ...post,
                    type: categoryName === "Opinion" ? "OPINION" : undefined,
                  }))}
                  layout="horizontal"
                  className="compact-grid"
                />
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
