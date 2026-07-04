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

const DEFAULT_SITE = ENV.NEXT_PUBLIC_DEFAULT_SITE

const normalizeCountry = (country: string): string => {
  const normalized = country?.trim().toLowerCase()
  return normalized || DEFAULT_SITE
}

const isValidUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false
  try {
    // eslint-disable-next-line no-new
    new URL(value)
    return true
  } catch {
    return false
  }
}

// Computed canonical defaults, used whenever a configured endpoint is missing
// or malformed so the app never points at an invalid URL.
const defaultGraphqlEndpoint = (edition: string): string =>
  `https://newsonafrica.com/${edition}/graphql`
const defaultRestEndpoint = (edition: string): string =>
  `https://newsonafrica.com/${edition}/wp-json/wp/v2`

// Defensive validation of a registry entry. Registry construction already
// validates env overrides, but callers may pass entries from other sources
// (tests, future config), so re-check each URL and fall back per-field.
const validateRegistryEndpoints = (
  edition: string,
  entry: WordPressEndpoints | undefined,
): WordPressEndpoints => {
  let graphql = entry?.graphql
  let rest = entry?.rest

  if (!isValidUrl(graphql)) {
    const fallback = defaultGraphqlEndpoint(edition)
    console.error("[wp-endpoints] Invalid registry graphql endpoint; using default", {
      country: edition,
      value: graphql,
      fallback,
    })
    graphql = fallback
  }

  if (!isValidUrl(rest)) {
    const fallback = defaultRestEndpoint(edition)
    console.error("[wp-endpoints] Invalid registry rest endpoint; using default", {
      country: edition,
      value: rest,
      fallback,
    })
    rest = fallback
  }

  return { graphql, rest }
}

// Legacy dynamic fallback: an unregistered edition may still be configured via
// NEXT_PUBLIC_WP_<CODE>_GRAPHQL / _REST_BASE env vars. Honour it but warn, since
// every edition should live in the editions registry.
const resolveUnregisteredEdition = (edition: string): WordPressEndpoints => {
  const upper = edition.toUpperCase()
  const graphqlEnv = process.env[`NEXT_PUBLIC_WP_${upper}_GRAPHQL`]
  const restEnv = process.env[`NEXT_PUBLIC_WP_${upper}_REST_BASE`]

  if (isValidUrl(graphqlEnv) || isValidUrl(restEnv)) {
    console.warn(
      `[DEPRECATION] Dynamic WordPress endpoint fallback used for unregistered edition "${edition}". Add it to the editions registry.`,
      { country: edition },
    )
    return {
      graphql: isValidUrl(graphqlEnv) ? graphqlEnv : defaultGraphqlEndpoint(edition),
      rest: isValidUrl(restEnv) ? restEnv : defaultRestEndpoint(edition),
    }
  }

  // No dynamic config — fall back to the default site's (validated) endpoints.
  const fallbackEdition = DEFAULT_SITE as EditionCode
  return validateRegistryEndpoints(fallbackEdition, WORDPRESS_EDITIONS_REGISTRY[fallbackEdition])
}

export function getWpEndpoints(country: string = DEFAULT_SITE): WordPressEndpoints {
  const normalized = normalizeCountry(country)

  if (!isEditionCode(normalized)) {
    return resolveUnregisteredEdition(normalized)
  }

  const edition = normalized as EditionCode
  return validateRegistryEndpoints(edition, WORDPRESS_EDITIONS_REGISTRY[edition])
}

export function getGraphQLEndpoint(country: string = DEFAULT_SITE): string {
  return getWpEndpoints(country).graphql
}

export function getRestBase(country: string = DEFAULT_SITE): string {
  return getWpEndpoints(country).rest
}

export const WORDPRESS_ENDPOINTS = new Proxy<Record<string, WordPressEndpoints>>(
  {},
  {
    get: (_, property: string | symbol) => {
      if (typeof property !== "string") return undefined
      return getWpEndpoints(property)
    },
  },
)
