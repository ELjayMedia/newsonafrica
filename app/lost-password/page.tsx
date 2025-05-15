import { Suspense } from "react"
import { LostPasswordContent } from "@/components/LostPasswordContent"

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LostPasswordContent />
    </Suspense>
  )
}
