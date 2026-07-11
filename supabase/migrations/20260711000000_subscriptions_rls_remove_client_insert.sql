-- NOA-143: remove the client-side INSERT path on public.subscriptions.
--
-- The table shipped with an INSERT policy for the `authenticated` role whose
-- only check was `auth.uid() = user_id`. That let any signed-in user insert
-- their own subscription row (e.g. plan='premium', status='active') directly
-- from the client and self-grant a paid plan without paying. Subscriptions must
-- only ever be written by a trusted server/webhook using the service role
-- (which bypasses RLS), never by the client.
--
-- Dropping the INSERT policy leaves RLS default-deny for writes by
-- anon/authenticated while the service-role webhook path is unaffected. The
-- SELECT-own policy is kept so users can still read their own subscription.

drop policy if exists subscriptions_insert on public.subscriptions;

-- Defensive: if a client UPDATE/DELETE policy was ever added, remove it too.
-- (No such policy exists today; these are no-ops if absent.)
drop policy if exists subscriptions_update on public.subscriptions;
drop policy if exists subscriptions_delete on public.subscriptions;
