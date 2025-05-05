"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function ApiErrorMessage() {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className="mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-500"
        >
          <path d="M12 9v4"></path>
          <path d="M12 17h.01"></path>
          <path d="M3.68 12A9 9 0 0 1 18 5.97"></path>
          <path d="M20.32 12A9 9 0 0 1 6 18.03"></path>
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        We're having trouble connecting to our content server. This could be due to network issues or server
        maintenance.
      </p>
      <div className="space-x-4">
        <Button onClick={handleRefresh} variant="default">
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          Go to Homepage
        </Button>
      </div>
    </div>
  )
}
