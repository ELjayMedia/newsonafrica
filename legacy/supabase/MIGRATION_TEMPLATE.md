# Supabase migration template

Use this pattern for every new table created in the `public` schema.

Supabase now requires explicit grants for tables exposed through the Data API. These grants do **not** replace Row Level Security (RLS). Always enable RLS and add policies that match the feature.

## Required pattern

```sql
-- 1) Create the table
create table public.example_table (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 2) Enable RLS immediately
alter table public.example_table enable row level security;

-- 3) Add Data API grants
-- Public read only. Use only when rows are safe to expose through RLS policies.
grant select on public.example_table to anon;

-- Signed-in app users. RLS still decides which rows they can read/write.
grant select, insert, update, delete on public.example_table to authenticated;

-- Backend/admin service role.
grant all privileges on public.example_table to service_role;

-- 4) Add RLS policies below this point
-- Example only; replace with feature-specific policies.
-- create policy "example_table_select_policy"
-- on public.example_table
-- for select
-- to authenticated
-- using (true);
```

## When creating sequences

```sql
grant usage, select on sequence public.example_table_id_seq to anon;
grant usage, select, update on sequence public.example_table_id_seq to authenticated;
grant all privileges on sequence public.example_table_id_seq to service_role;
```

## Notes

- Do not grant broad function/RPC execution in migration templates.
- Do not rely on grants alone for security; RLS remains mandatory for user-facing tables.
- Avoid granting `anon` write permissions unless the table is specifically designed for public writes and protected by strict RLS.
- For private tables, it is acceptable to omit `anon` grants entirely.
