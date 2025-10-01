"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log error details for debugging
  if (typeof window !== "undefined") {
    console.error("[v0] Error boundary caught:", error)
  }

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message || "An unexpected error occurred"}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Try again
      </button>
    </div>
  )
}
