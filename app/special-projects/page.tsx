import { Suspense } from "react"
import { SpecialProjectsContent } from "@/components/SpecialProjectsContent"

export default function SpecialProjectsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SpecialProjectsContent />
    </Suspense>
  )
}
