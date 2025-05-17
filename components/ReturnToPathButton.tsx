"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function ReturnToPathButton() {
  const searchParams = useSearchParams()
  const [returnPath, setReturnPath] = useState<string>("/")

  useEffect(() => {
    // Get the from parameter or default to homepage
    const from = searchParams.get("from")
    setReturnPath(from || "/")
  }, [searchParams])

  return (
    <Link href={returnPath} className="text-blue-600 hover:underline">
      Return to Previous Page
    </Link>
  )
}
