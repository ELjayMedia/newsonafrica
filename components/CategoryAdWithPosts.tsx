import { useQuery } from "@tanstack/react-query"
import { ReviveAd } from "./ReviveAd"
import { fetchCategoryPosts } from "@/lib/wordpress-api/fetch"

interface CategoryAdWithPostsProps {
  categorySlug: string
  zoneId: string
  width: number | string
  height: number
  className?: string
}

export function CategoryAdWithPosts({ categorySlug, zoneId, width, height, className }: CategoryAdWithPostsProps) {
  const { data: categoryData } = useQuery({
    queryKey: ["categoryPosts", categorySlug],
    queryFn: () => fetchCategoryPosts(categorySlug),
    staleTime: 60000, // 1 minute
  })

  const categoryPosts = categoryData?.posts || []

  return <ReviveAd zoneId={zoneId} width={width} height={height} className={className} categoryPosts={categoryPosts} />
}
