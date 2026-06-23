"use client"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"

interface HeaderInteractiveProps {
  categories: HeaderCategory[]
  countryCode: string
}

export function HeaderInteractive({ categories, countryCode }: HeaderInteractiveProps) {
  return <HeaderClient categories={categories ?? []} countryCode={countryCode} />
}
