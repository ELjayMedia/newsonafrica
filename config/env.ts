import { z } from "zod"

const DEFAULT_SITE_URL = "http://app.newsonafrica.com"

const trimToUndefined = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const stringWithDefault = (defaultValue: string) => z.preprocess(trimToUndefined, z.string().default(defaultValue))

const graphQlEndpointOverride = (countryCode: string) =>
  z.preprocess(
    trimToUndefined,
    z
      .string()
      .url({ message: "Expected an absolute GraphQL endpoint URL" })
      .superRefine((value, ctx) => {
        try {
          const url = new URL(value)
          const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase()
          const expectedSuffix = `/${countryCode.toLowerCase()}/graphql`

          if (!normalizedPath.endsWith(expectedSuffix)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Expected the GraphQL endpoint to end with "${expectedSuffix}"`,
            })
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expected a valid GraphQL endpoint URL",
          })
        }
      })
      .optional(),
  )

const CLIENT_ENV_SCHEMA = z.object({
  NEXT_PUBLIC_SITE_URL: stringWithDefault(DEFAULT_SITE_URL),
  NEXT_PUBLIC_DEFAULT_SITE: stringWithDefault("sz"),
  NEXT_PUBLIC_WP_SZ_GRAPHQL: graphQlEndpointOverride("sz"),
  NEXT_PUBLIC_WP_ZA_GRAPHQL: graphQlEndpointOverride("za"),
  NEXT_PUBLIC_WP_NG_GRAPHQL: graphQlEndpointOverride("ng"),
  NEXT_PUBLIC_WP_KE_GRAPHQL: graphQlEndpointOverride("ke"),
  NEXT_PUBLIC_WP_TZ_GRAPHQL: graphQlEndpointOverride("tz"),
  NEXT_PUBLIC_WP_EG_GRAPHQL: graphQlEndpointOverride("eg"),
  NEXT_PUBLIC_WP_GH_GRAPHQL: graphQlEndpointOverride("gh"),
})

const parsedEnv = CLIENT_ENV_SCHEMA.parse(process.env)

type EnvConfig = z.infer<typeof CLIENT_ENV_SCHEMA>

const ENV: Readonly<EnvConfig> = Object.freeze(parsedEnv)

export const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || ""

export { ENV }
export type { EnvConfig }
