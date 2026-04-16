# News on Africa

## Supabase setup

1. Copy `.env.example` to `.env.local` (or your deployment environment secret manager).
2. Fill in the Supabase keys for your project.

### Required variables

- `NEXT_PUBLIC_SUPABASE_URL`
  - Used in both client and server runtime to initialize Supabase clients.
  - Format: `https://<your-project-ref>.supabase.co`. Retrieve your project URL from the Supabase dashboard (Project settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Public key used by browser/client runtime and non-privileged server calls.
  - Scope is limited by your Row Level Security (RLS) policies.
- `SUPABASE_SERVICE_ROLE_KEY`
  - **Server-only** key for privileged backend tasks.
  - Never expose this key in client code, logs, or public environment files.

### Data API endpoint derivation

The Supabase Data API endpoint is derived from `NEXT_PUBLIC_SUPABASE_URL` by appending `/rest/v1`.

Example:

- Project URL: `https://your-project-ref.supabase.co`
- Data API endpoint: `https://your-project-ref.supabase.co/rest/v1`

Use the anon key for client-safe Data API access and the service role key only for trusted server-side operations.
