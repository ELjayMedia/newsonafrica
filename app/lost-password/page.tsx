import { Suspense } from "react"
import LostPasswordWrapper from "./LostPasswordWrapper"

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <LostPasswordWrapper />
    </Suspense>
  )
}
