import { Suspense } from "react"
import { RegisterContent } from "@/components/RegisterContent"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
