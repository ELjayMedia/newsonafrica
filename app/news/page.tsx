import { Suspense } from "react"
import { NewsContent } from "@/components/NewsContent"

export default function NewsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewsContent />
    </Suspense>
  )
}
