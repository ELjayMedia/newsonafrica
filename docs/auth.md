# Authentication

This project uses Supabase to manage user accounts. OAuth login is available via Google and Facebook.

## Login Providers

Refer to [supabase-oauth-setup.md](./supabase-oauth-setup.md) for detailed instructions on configuring Google and Facebook in the Supabase Dashboard. The guide lists the required redirect URLs and steps for obtaining OAuth credentials.

## Environment Variables

Add the following variables to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for the client-side OAuth flow. `SUPABASE_SERVICE_ROLE_KEY` is used for server-side actions.

After setting these variables you can run `scripts/verify-oauth-setup.sh` to check the configuration.
