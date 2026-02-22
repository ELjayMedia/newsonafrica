import { z } from "zod"

import { ENV } from "@/config/env"

export const EDITION_CODES = ["sz", "za", "ng"] as const

export type EditionCode = (typeof EDITION_CODES)[number]

export interface EditionEndpoints {
  graphql: string
  rest: string
}

const BASE_URL = "https://newsonafrica.com"

type EndpointEnvKey =
  | "NEXT_PUBLIC_WP_SZ_GRAPHQL"
  | "NEXT_PUBLIC_WP_ZA_GRAPHQL"
  | "NEXT_PUBLIC_WP_NG_GRAPHQL"
  | "NEXT_PUBLIC_WP_SZ_REST_BASE"
  | "NEXT_PUBLIC_WP_ZA_REST_BASE"
  | "NEXT_PUBLIC_WP_NG_REST_BASE"

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "")

const defaultGraphqlEndpoint = (edition: EditionCode): string => `${BASE_URL}/${edition}/graphql`
const defaultRestEndpoint = (edition: EditionCode): string => `${BASE_URL}/${edition}/wp-json/wp/v2`

const ENDPOINT_SCHEMA = z.string().url()

const logInvalidEndpoint = (params: {
  edition: EditionCode
  type: keyof EditionEndpoints
  envKey: EndpointEnvKey
  providedValue?: string
  fallback: string
  issues: z.ZodIssue[]
}) => {
  const { edition, type, envKey, providedValue, fallback, issues } = params

  console.error("[wp-editions-registry] Invalid endpoint env override; using fallback", {
    edition,
    endpointType: type,
    envKey,
    providedValue,
    fallback,
    issues: issues.map((issue) => issue.message),
  })
}

const resolveEndpoint = (params: {
  edition: EditionCode
  type: keyof EditionEndpoints
  envKey: EndpointEnvKey
  fallback: string
}): string => {
  const { edition, type, envKey, fallback } = params
  const rawValue = ENV[envKey]

  if (typeof rawValue !== "string" || !rawValue) {
    return fallback
  }

  const parsed = ENDPOINT_SCHEMA.safeParse(trimTrailingSlashes(rawValue))

  if (parsed.success) {
    return parsed.data
  }

  logInvalidEndpoint({
    edition,
    type,
    envKey,
    providedValue: rawValue,
    fallback,
    issues: parsed.error.issues,
  })

  return fallback
}

const createEditionEndpoints = (edition: EditionCode): EditionEndpoints => ({
  graphql: resolveEndpoint({
    edition,
    type: "graphql",
    envKey: `NEXT_PUBLIC_WP_${edition.toUpperCase()}_GRAPHQL` as EndpointEnvKey,
    fallback: defaultGraphqlEndpoint(edition),
  }),
  rest: resolveEndpoint({
    edition,
    type: "rest",
    envKey: `NEXT_PUBLIC_WP_${edition.toUpperCase()}_REST_BASE` as EndpointEnvKey,
    fallback: defaultRestEndpoint(edition),
  }),
})

const EDITIONS_REGISTRY_SCHEMA = z.object({
  sz: z.object({
    graphql: z.string().url(),
    rest: z.string().url(),
  }),
  za: z.object({
    graphql: z.string().url(),
    rest: z.string().url(),
  }),
  ng: z.object({
    graphql: z.string().url(),
    rest: z.string().url(),
  }),
})

export const WORDPRESS_EDITIONS_REGISTRY = EDITIONS_REGISTRY_SCHEMA.parse({
  sz: createEditionEndpoints("sz"),
  za: createEditionEndpoints("za"),
  ng: createEditionEndpoints("ng"),
})

export const isEditionCode = (country: string): country is EditionCode =>
  EDITION_CODES.includes(country as EditionCode)
