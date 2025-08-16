"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function SafeReturnLink() {
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const returnPath = from || "/"

  return (
    <Link
      href={returnPath}
      className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
    >
      {from ? "Return to Previous Page" : "Return to Homepage"}
    </Link>
  )
}
