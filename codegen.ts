import type { CodegenConfig } from "@graphql-codegen/cli"

const defaultSchema =
  process.env.NEXT_PUBLIC_WP_GRAPHQL ||
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
  "https://newsonafrica.com/sz/graphql"

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
