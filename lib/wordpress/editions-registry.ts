import { z } from "zod"

import { ENV } from "@/config/env"

export const EDITION_CODES = ["sz", "za", "ng"] as const

export type EditionCode = (typeof EDITION_CODES)[number]

export interface EditionEndpoints {
  graphql: string
  rest: string
}

const BASE_URL = "https://newsonafrica.com"

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "")

const defaultGraphqlEndpoint = (edition: EditionCode): string => `${BASE_URL}/${edition}/graphql`
const defaultRestEndpoint = (edition: EditionCode): string => `${BASE_URL}/${edition}/wp-json/wp/v2`

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
  sz: {
    graphql: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_SZ_GRAPHQL || defaultGraphqlEndpoint("sz")),
    rest: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_SZ_REST_BASE || defaultRestEndpoint("sz")),
  },
  za: {
    graphql: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_ZA_GRAPHQL || defaultGraphqlEndpoint("za")),
    rest: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_ZA_REST_BASE || defaultRestEndpoint("za")),
  },
  ng: {
    graphql: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_NG_GRAPHQL || defaultGraphqlEndpoint("ng")),
    rest: trimTrailingSlashes(ENV.NEXT_PUBLIC_WP_NG_REST_BASE || defaultRestEndpoint("ng")),
  },
})

export const isEditionCode = (country: string): country is EditionCode =>
  EDITION_CODES.includes(country as EditionCode)
