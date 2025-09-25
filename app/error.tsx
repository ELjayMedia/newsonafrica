"use client"

import { useEffect, useState } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    setIsDev(process.env.NODE_ENV !== "production")
    console.error("App error boundary caught:", error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      {isDev && (
        <div className="mx-auto my-4 max-w-2xl text-left text-sm leading-relaxed whitespace-pre-wrap">
          <div className="font-semibold mb-2">Error:</div>
          <div className="mb-4">{error?.message ?? "Unknown error"}</div>
          {error?.stack && (
            <>
              <div className="font-semibold mb-2">Stack:</div>
              <details open className="bg-neutral-100 p-3 rounded-md">
                <summary>Toggle stack trace</summary>
                <pre className="overflow-auto text-xs mt-2">{error.stack}</pre>
              </details>
            </>
          )}
          {error?.digest && <p className="mt-2 text-xs opacity-70">Digest: {error.digest}</p>}
        </div>
      )}
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Try again
      </button>
    </div>
  )
}
