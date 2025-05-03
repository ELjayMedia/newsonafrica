"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-gray-900 md:text-8xl">Error</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-700 md:text-3xl">Something went wrong</h2>
      <p className="mt-4 text-gray-600 md:text-lg">We apologize for the inconvenience. Please try again later.</p>
      <div className="mt-8 flex gap-4">
        <button onClick={reset} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
          Try again
        </button>
        <Link href="/" className="px-4 py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50">
          Return to Homepage
        </Link>
      </div>
    </div>
  )
}
