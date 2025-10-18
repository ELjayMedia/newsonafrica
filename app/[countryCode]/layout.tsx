import type { ReactNode } from "react"
import { notFound } from "next/navigation"

import { LayoutStructure } from "@/components/LayoutStructure"
import { SiteHeader } from "@/components/nav/SiteHeader"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { SUPPORTED_EDITIONS, isCountryEdition } from "@/lib/editions"

interface CountryLayoutProps {
  children: ReactNode
  params: { countryCode: string }
}

const normalizeCountryParam = (value: string): string => value.trim().toLowerCase()

export default function CountryLayout({ children, params }: CountryLayoutProps) {
  const countryParam = params?.countryCode ?? ""
  const normalized = normalizeCountryParam(countryParam)
  const edition = SUPPORTED_EDITIONS.find(({ code }) => code === normalized)

  if (!edition) {
    notFound()
  }

  const sidebarCountry = isCountryEdition(edition) ? edition.code : DEFAULT_COUNTRY

  return (
    <LayoutStructure
      countryCode={sidebarCountry}
      header={<SiteHeader countryCode={edition.code} />}
    >
      {children}
    </LayoutStructure>
  )
}
