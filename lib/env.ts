const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WORDPRESS_AUTH_TOKEN',
  'WP_APP_USERNAME',
  'WP_APP_PASSWORD',
  'WORDPRESS_WEBHOOK_SECRET',
  'PAYSTACK_SECRET_KEY',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'REVALIDATION_SECRET',
  'CSRF_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_DEFAULT_SITE',
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

export function getEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return requiredEnvVars.reduce((env, key) => {
    env[key] = process.env[key] as string;
    return env;
  }, {} as Record<RequiredEnvVar, string>);
}

export const env = getEnv();
