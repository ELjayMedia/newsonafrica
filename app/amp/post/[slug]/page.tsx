import { fetchSinglePost } from "@/lib/wordpress-api"
import { notFound } from "next/navigation"
import { AMPPostContent } from "@/components/amp/AMPPostContent"

export const runtime = "edge"

interface PostPageProps {
  params: { slug: string }
}

export default async function AMPPostPage({ params }: PostPageProps) {
  const post = await fetchSinglePost(params.slug)

  if (!post) {
    notFound()
  }

  return <AMPPostContent post={post} />
}
