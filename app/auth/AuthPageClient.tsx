"use client"

import { useSearchParams } from "next/navigation"
import { SimpleAuthForm } from "@/components/SimpleAuthForm"

export default function AuthPageClient() {
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <SimpleAuthForm defaultTab={searchParams?.tab === "signup" ? "signup" : "signin"} />
    </div>
  )
}
