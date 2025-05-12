import { Suspense } from "react"
import LostPasswordClientWrapper from "./LostPasswordClientWrapper"

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <LostPasswordClientWrapper />
    </Suspense>
  )
}
