import { ENV } from "@/config/env"
import {
  type EditionCode,
  isEditionCode,
  WORDPRESS_EDITIONS_REGISTRY,
} from "@/lib/wordpress/editions-registry"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const BASE_URL = "https://newsonafrica.com"
const DEFAULT_SITE = ENV.NEXT_PUBLIC_DEFAULT_SITE
const GRAPHQL_SUFFIX = "GRAPHQL"
const REST_SUFFIX = "REST_BASE"
const DEPRECATION_WARNING =
  "[DEPRECATION] Dynamic WP endpoint env lookups are deprecated; use lib/wordpress/editions-registry.ts explicit edition entries instead."

const trimTrailingSlashes = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined
  }

  return value.replace(/\/+$/, "")
}

const normalizeCountry = (country: string): string => {
  const normalized = country?.trim().toLowerCase()
  return normalized || DEFAULT_SITE
}

const buildEnvKey = (country: string, suffix: string) => `NEXT_PUBLIC_WP_${country.toUpperCase()}_${suffix}`

const getDefaultGraphQLEndpoint = (country: string): string => `${BASE_URL}/${country}/graphql`
const getDefaultRestBase = (country: string): string => `${BASE_URL}/${country}/wp-json/wp/v2`

const warnDeprecationFallback = (country: string, dynamicEnvKey: string) => {
  console.warn(DEPRECATION_WARNING, {
    country,
    dynamicEnvKey,
  })
}

const getRegistryEndpoints = (country: string): WordPressEndpoints | undefined => {
  if (!isEditionCode(country)) {
    return undefined
  }

  return WORDPRESS_EDITIONS_REGISTRY[country as EditionCode]
}

const getDynamicFallbackEndpoints = (country: string): WordPressEndpoints => {
  const graphqlKey = buildEnvKey(country, GRAPHQL_SUFFIX)
  const restKey = buildEnvKey(country, REST_SUFFIX)

  const dynamicGraphql = trimTrailingSlashes(process.env[graphqlKey])
  const dynamicRest = trimTrailingSlashes(process.env[restKey])

  if (dynamicGraphql || dynamicRest) {
    warnDeprecationFallback(country, [graphqlKey, restKey].filter((key) => process.env[key]).join(", "))
  }

  return {
    graphql: dynamicGraphql || getDefaultGraphQLEndpoint(country),
    rest: dynamicRest || getDefaultRestBase(country),
  }
}

export function getGraphQLEndpoint(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  return getWpEndpoints(normalized).graphql
}

export function getRestBase(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  return getWpEndpoints(normalized).rest
}

export function getWpEndpoints(country: string = DEFAULT_SITE): WordPressEndpoints {
  const normalized = normalizeCountry(country)
  return getRegistryEndpoints(normalized) || getDynamicFallbackEndpoints(normalized)
}

export const WORDPRESS_ENDPOINTS = new Proxy<Record<string, WordPressEndpoints>>(
  {},
  {
    get: (_, property: string | symbol) => {
      if (typeof property !== "string") {
        return undefined
      }

      return getWpEndpoints(property)
    },
  },
)
