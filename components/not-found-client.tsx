"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export default function NotFoundClient() {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
      <h1 className={`font-bold text-gray-900 ${isMobile ? "text-6xl" : "text-8xl"}`}>404</h1>
      <h2 className={`mt-4 font-semibold text-gray-700 ${isMobile ? "text-2xl" : "text-3xl"}`}>Page Not Found</h2>
      <p className={`mt-4 text-gray-600 ${isMobile ? "text-base" : "text-lg"}`}>
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    </div>
  )
}
