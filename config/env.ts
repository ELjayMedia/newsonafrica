import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_WORDPRESS_API_URL: z.string().url(),
  WORDPRESS_REST_API_URL: z.string().url().optional(),
  WORDPRESS_AUTH_TOKEN: z.string().optional(),
  WP_APP_USERNAME: z.string().optional(),
  WP_APP_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\u274c Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
