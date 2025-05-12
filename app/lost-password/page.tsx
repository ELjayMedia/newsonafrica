import dynamic from "next/dynamic"
import { Suspense } from "react"

// Dynamically import the client component with SSR disabled
const LostPasswordContent = dynamic(() => import("@/components/LostPasswordContent"), {
  ssr: false,
})

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-4">Loading...</div>}>
      <LostPasswordContent />
    </Suspense>
  )
}
