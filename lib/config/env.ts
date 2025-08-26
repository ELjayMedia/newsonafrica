import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://newsonafrica.com"),
    LOG_LEVEL: z.string().default("info"),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
  })
  .passthrough();

const env = envSchema.parse(process.env);

export default env;
