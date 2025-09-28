"use client"

import { ElegantAuthForm } from "@/components/ElegantAuthForm"

interface AuthPageClientProps {
  searchParams?: { redirectTo?: string; error?: string; tab?: string }
}

export default function AuthPageClient({ searchParams }: AuthPageClientProps) {
  return <ElegantAuthForm />
}
