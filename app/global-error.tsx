"use client"

export default function GlobalError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
