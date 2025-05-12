import { Suspense } from "react"
import dynamic from "next/dynamic"

// Use dynamic import with no SSR to prevent prerendering
const LostPasswordContent = dynamic(
  () => import("@/components/LostPasswordContent").then((mod) => mod.LostPasswordContent),
  { ssr: false },
)

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LostPasswordContent />
    </Suspense>
  )
}
