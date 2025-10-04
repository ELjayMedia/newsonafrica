import type { CodegenConfig } from "@graphql-codegen/cli"

const defaultSite = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
const defaultGraphQLKey = `NEXT_PUBLIC_WP_${defaultSite.toUpperCase()}_GRAPHQL`

const defaultSchema =
  process.env[defaultGraphQLKey] ||
  `https://newsonafrica.com/${defaultSite}/graphql`

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      [defaultSchema]: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    },
  ],
  documents: ["lib/wordpress-queries.ts"],
  generates: {
    "types/wpgraphql.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        avoidOptionals: true,
        immutableTypes: true,
        enumsAsTypes: true,
      },
    },
  },
}

export default config
