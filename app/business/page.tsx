import { Suspense } from "react"
import { BusinessContent } from "@/components/BusinessContent"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"

export const metadata = {
  title: "Business News - News On Africa",
  description: "Latest business news and analysis from across Africa",
}

export default function BusinessPage() {
  return (
    <Suspense fallback={<NewsGridSkeleton />}>
      <BusinessContent />
    </Suspense>
  )
}
