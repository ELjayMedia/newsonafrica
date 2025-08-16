# Architecture

This project uses Next.js (App Router) with Supabase for authentication and a headless WordPress CMS.

```
src/
  app/            # Routes and layouts
  components/     # Shared UI components
  features/       # Domain features (cms, auth)
  lib/            # Utilities and clients
  styles/         # Global styles
  types/          # Shared schemas and types
```

Data flows from WordPress through helpers in `src/lib/wpClient.ts` and is cached using the adapters in `src/lib/cache.ts`.
