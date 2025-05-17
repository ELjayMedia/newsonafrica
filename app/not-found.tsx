import { Suspense } from "react"
import Link from "next/link"
import ReturnToPathButton from "@/components/ReturnToPathButton"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="mb-8">Sorry, we couldn't find the page you're looking for.</p>
      <Suspense
        fallback={
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Homepage
          </Link>
        }
      >
        <ReturnToPathButton />
      </Suspense>
    </div>
  )
}
