-- Ensure public functions have an explicit search_path.
-- This mirrors the already-applied production migration version so Supabase migration history stays in sync.

do $$
declare
  fn record;
begin
  for fn in
    select
      p.oid::regprocedure as fn_identity,
      n.nspname as schema_name,
      p.proname as function_name,
      p.prosecdef as security_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not in (
        'content_index_update_search_vector',
        'search_content',
        'search_suggestions'
      )
  loop
    execute format('alter function %s set search_path = public', fn.fn_identity);
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'content_index_update_search_vector'
  ) then
    alter function public.content_index_update_search_vector() set search_path = public, pg_temp;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'search_content'
  ) then
    alter function public.search_content(text, text, text, integer, integer) set search_path = public, pg_temp;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'search_suggestions'
  ) then
    alter function public.search_suggestions(text, text, integer) set search_path = public, pg_temp;
  end if;
end $$;