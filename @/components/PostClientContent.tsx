import { useQuery } from "@tanstack/react-query"

// ... other imports

async function fetchSinglePost(slug: string) {
  // Replace this with your actual fetch logic
  const res = await fetch(`/api/posts/${slug}`)
  if (!res.ok) {
    throw new Error("Failed to fetch post")
  }
  return res.json()
}

export function PostClientContent({ slug }: { slug: string }) {
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchSinglePost(slug),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // ... rest of the component
}
