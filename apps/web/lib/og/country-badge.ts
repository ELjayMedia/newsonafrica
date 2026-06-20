import { AFRICAN_EDITION, SUPPORTED_COUNTRIES } from "@/lib/editions"

export interface CountryOgBadge {
  code: string
  /** Human friendly country or edition label */
  label: string
  /** Emoji flag representation used as a semantic fallback */
  flag: string
  /** Absolute path (from the public folder) to the badge asset */
  assetPath: string
  /** Accent color used for gradients and borders */
  accentColor: string
}

const BADGE_ASSETS: Record<string, Pick<CountryOgBadge, "assetPath" | "accentColor">> = {
  sz: {
    assetPath: "/og/badges/sz.svg",
    accentColor: "#0ea5e9",
  },
  za: {
    assetPath: "/og/badges/za.svg",
    accentColor: "#16a34a",
  },
  [AFRICAN_EDITION.code]: {
    assetPath: "/og/badges/default.svg",
    accentColor: "#f97316",
  },
}

const DEFAULT_BADGE: CountryOgBadge = {
  code: AFRICAN_EDITION.code,
  label: AFRICAN_EDITION.name,
  flag: AFRICAN_EDITION.flag,
  ...BADGE_ASSETS[AFRICAN_EDITION.code],
}

/**
 * Resolve the badge information used by dynamic Open Graph images.
 * Ensures we always return a valid asset and styling configuration.
 */
export function resolveCountryOgBadge(countryCode?: string): CountryOgBadge {
  const normalized = countryCode?.toLowerCase() ?? ""
  const matched = SUPPORTED_COUNTRIES.find((country) => country.code === normalized)

  if (!matched) {
    return DEFAULT_BADGE
  }

  const badge = BADGE_ASSETS[matched.code] ?? BADGE_ASSETS[AFRICAN_EDITION.code]

  return {
    code: matched.code,
    label: matched.name,
    flag: matched.flag,
    assetPath: badge.assetPath,
    accentColor: badge.accentColor,
  }
}
