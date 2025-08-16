"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function SafeReturnToPathButton() {
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const returnPath = from || "/"

  return (
    <Link href={returnPath} className="text-blue-600 hover:underline">
      {from ? "Return to Previous Page" : "Return to Homepage"}
    </Link>
  )
}
