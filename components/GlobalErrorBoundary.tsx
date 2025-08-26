"use client"

import type React from "react"

import { useEffect, useState } from "react"

export default function GlobalErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Add a global error handler
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error)
      // Prevent the error from showing in the console
      event.preventDefault()
      setHasError(true)
    }

    window.addEventListener("error", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-700 mb-4">
            We're sorry, but there was an error loading the page. Please try refreshing the browser.
          </p>
          <button
            onClick={() => {
              setHasError(false)
              window.location.reload()
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
