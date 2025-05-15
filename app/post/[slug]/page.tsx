import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchSinglePost } from "@/lib/wordpress-api"
import { PostClientContent } from "@/components/PostClientContent"
import { PostSkeleton } from "@/components/PostSkeleton"

export const revalidate = 60 // Revalidate every 60 seconds

interface PostPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  try {
    const post = await fetchSinglePost(params.slug)
    if (!post) return { title: "Article Not Found" }

    return {
      title: post.seo?.title || `${post.title} - News On Africa`,
      description: post.seo?.metaDesc || post.excerpt,
      openGraph: {
        title: post.seo?.title || post.title,
        description: post.seo?.metaDesc || post.excerpt,
        url: `https://newsonafrica.com/post/${params.slug}`,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.modified,
        authors: [post.author.node.name],
        images: [
          {
            url: post.seo?.opengraphImage?.sourceUrl || post.featuredImage?.node?.sourceUrl || "/default-og-image.jpg",
          },
        ],
        siteName: "News On Africa",
      },
      twitter: {
        card: "summary_large_image",
        title: post.seo?.title || post.title,
        description: post.seo?.metaDesc || post.excerpt,
        images: [post.seo?.opengraphImage?.sourceUrl || post.featuredImage?.node?.sourceUrl || "/default-og-image.jpg"],
      },
    }
  } catch (error) {
    console.error(`Error generating metadata for post ${params.slug}:`, error)
    return { title: "Article - News On Africa" }
  }
}

export default function Post({ params }: PostPageProps) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostWrapper slug={params.slug} />
    </Suspense>
  )
}

async function PostWrapper({ slug }: { slug: string }) {
  try {
    const post = await fetchSinglePost(slug)
    if (!post) {
      notFound()
    }
    return <PostClientContent slug={slug} initialData={post} />
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error)
    throw error // This will trigger the closest error boundary
  }
}
