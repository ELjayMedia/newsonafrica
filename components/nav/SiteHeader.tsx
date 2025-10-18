import Link from "next/link"

import { HeaderMenu } from "@/components/nav/HeaderMenu"
import { CountrySwitcherClient } from "@/components/nav/CountrySwitcherClient"
import { DEFAULT_COUNTRY, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import { AFRICAN_EDITION } from "@/lib/editions"

interface SiteHeaderProps {
  countryCode: string
}

const normalizeCountryCode = (value: string): string => {
  const trimmed = value.trim().toLowerCase()
  return trimmed || DEFAULT_COUNTRY
}

export async function SiteHeader({ countryCode }: SiteHeaderProps) {
  const normalized = normalizeCountryCode(countryCode)
  const isAfricanEdition = normalized === AFRICAN_EDITION.code
  const isSupportedCountry = SUPPORTED_COUNTRIES.includes(normalized)
  const menuCountry = isSupportedCountry ? normalized : DEFAULT_COUNTRY
  const switcherValue = isAfricanEdition ? AFRICAN_EDITION.code : menuCountry
  const homeHref = isAfricanEdition ? "/" : `/${menuCountry}`

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={homeHref} className="text-lg font-semibold tracking-tight text-gray-900" prefetch={false}>
          News On Africa
        </Link>
        <div className="flex items-center gap-3">
          <CountrySwitcherClient currentCountry={switcherValue} />
        </div>
      </div>
      <HeaderMenu countryCode={menuCountry} />
    </header>
  )
}
