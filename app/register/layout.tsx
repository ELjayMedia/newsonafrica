import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Register - News On Africa",
  description: "Create an account on News On Africa",
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="p-4">{children}</div>
}
