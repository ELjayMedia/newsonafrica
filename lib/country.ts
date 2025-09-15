export const SUPPORTED = ["sz", "za"] as const;
export type CountryCode = typeof SUPPORTED[number];

export function resolveGraphQLEndpoint(cc: string): string {
  const key = cc?.toUpperCase();
  const endpoints: Record<string, string | undefined> = {
    SZ: process.env.WP_GRAPHQL_SZ,
    ZA: process.env.WP_GRAPHQL_ZA,
  };
  return endpoints[key] || process.env.WP_GRAPHQL_DEFAULT || "";
}
