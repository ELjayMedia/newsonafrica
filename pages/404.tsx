import { Suspense } from "react"
import Link from "next/link"
import ReturnLink from "../components/ReturnLink"

export default function Custom404() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="mb-8">Sorry, we couldn't find the page you're looking for.</p>
      <Suspense
        fallback={
          <Link
            href="/"
            className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Return to Homepage
          </Link>
        }
      >
        <ReturnLink />
      </Suspense>
    </div>
  )
}
