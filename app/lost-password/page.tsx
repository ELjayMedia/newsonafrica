import { Suspense } from "react"
import { ClientLostPasswordContent } from "@/components/ClientLostPasswordContent"

export const dynamic = "force-dynamic"

export default function LostPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientLostPasswordContent />
    </Suspense>
  )
}
