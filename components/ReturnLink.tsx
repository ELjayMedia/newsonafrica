"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export type ReturnLinkVariant = "button" | "text"
export type ReturnLinkAlignment = "left" | "center" | "right"

export interface ReturnLinkProps {
  variant?: ReturnLinkVariant
  alignment?: ReturnLinkAlignment | "none"
  fallbackLabel?: string
}

const alignmentClasses: Record<ReturnLinkAlignment, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
}

export default function ReturnLink({
  variant = "button",
  alignment,
  fallbackLabel = "Return to Homepage",
}: ReturnLinkProps) {
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const href = from || "/"
  const label = from ? "Return to Previous Page" : fallbackLabel

  const linkClassName =
    variant === "button"
      ? "px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
      : "text-blue-600 hover:underline"

  const link = (
    <Link href={href} className={linkClassName}>
      {label}
    </Link>
  )

  const resolvedAlignment = alignment ?? "center"

  if (resolvedAlignment === "none") {
    return link
  }

  return <div className={`flex ${alignmentClasses[resolvedAlignment]}`}>{link}</div>
}
