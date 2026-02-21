# `lib/dal` decommission notice

`lib/dal/*` was previously a thin alias layer that re-exported modules from `lib/supabase/rest/*`.

As of this migration, that duplicate layer has been removed because runtime code no longer imports `@/lib/dal/*`.

## Where to import from now

- Bookmarks: `@/lib/supabase/rest/bookmarks`
- Comments: `@/lib/supabase/rest/comments`
- Profiles: `@/lib/supabase/rest/profiles`
- User preferences: `@/lib/supabase/rest/user-preferences`

If a true DAL abstraction is needed in the future, add domain interfaces and concrete adapters rather than alias/re-export files.
