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

const getRegistryEndpoints = (country: string): WordPressEndpoints => {
  const fallbackEdition = DEFAULT_SITE as EditionCode
  const edition = (isEditionCode(country) ? country : fallbackEdition) as EditionCode
  return WORDPRESS_EDITIONS_REGISTRY[edition]
}

export function getGraphQLEndpoint(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  return getRegistryEndpoints(normalized).graphql
}

export function getRestBase(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  return getRegistryEndpoints(normalized).rest
}

export function getWpEndpoints(country: string = DEFAULT_SITE): WordPressEndpoints {
  const normalized = normalizeCountry(country)
  return getRegistryEndpoints(normalized)
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
