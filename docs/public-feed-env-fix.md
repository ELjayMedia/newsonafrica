# Public WordPress feed environment fix

Production symptoms:

- `/sz` returned HTTP 200 but rendered the controlled `No stories available yet` fallback.
- Vercel runtime logs showed `Country feed unavailable on pan-African home`.
- The thrown error came from global server env validation, not WordPress itself.

Root cause:

Public WordPress reads touch `serverEnv` through the WordPress GraphQL and country endpoint helpers. The previous server env schema required admin-only values such as the Supabase service-role key and sync/webhook secrets whenever *any* server env value was read. Because the public feed only needs the WordPress base URL and optional WordPress request settings, missing or short admin-only secrets blocked article feeds before posts could be fetched.

Fix:

- Keep `WORDPRESS_API_URL` required for public server-side WordPress reads.
- Treat admin-only secrets as optional at global env-load time.
- Keep privileged Supabase admin validation local to the privileged client.
- Add a regression test proving that public WordPress config can be read even when admin-only secrets are absent or short.

This does not remove the need to configure the admin secrets for webhooks/content sync. It only prevents those admin-only settings from blanking the public front end.
