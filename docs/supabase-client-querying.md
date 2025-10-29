# Supabase Client Querying Guidelines

When requesting data from Supabase in client-side code, keep payloads as small as possible to control egress costs and keep the UI responsive.

## Pagination first

- Always page through tables and views – never request unbounded result sets.
- Default to small page sizes (for example, 20 rows per request) and fetch additional pages on demand.

```ts
// list (thin view)
const { data } = await supabase
  .from('v_comments_list')
  .select('id,post_id,snippet,created_at,reaction_count')
  .order('created_at', { ascending: false })
  .range(0, 19);
```

## Project only the columns you need

- Never rely on `select('*')`; explicitly list the columns that the view requires.
- Materialize lightweight database views when the UI only needs partial entities.

## Request counts without fetching rows

- When you only need totals, request counts with `head: true` so Supabase returns the metadata without row payloads.

```ts
// counts without rows (tiny egress)
const { count } = await supabase
  .from('comments')
  .select('id', { count: 'exact', head: true });
```

Following these rules keeps the Supabase integration efficient and scalable as traffic grows.
