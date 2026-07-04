-- Security fixes:
-- 1. Enable RLS on comment_reports, comment_threads, schema_versions
-- 2. Restrict subscription INSERT/UPDATE to service role only

-- COMMENT_REPORTS
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report comments" ON public.comment_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.comment_reports;
DROP POLICY IF EXISTS "Service role manages reports" ON public.comment_reports;

-- Authenticated users can submit a report against any comment
CREATE POLICY "Users can report comments"
  ON public.comment_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports"
  ON public.comment_reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- Service role has full access for moderation operations
CREATE POLICY "Service role manages reports"
  ON public.comment_reports
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- COMMENT_THREADS
ALTER TABLE public.comment_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment threads" ON public.comment_threads;
DROP POLICY IF EXISTS "Service role manages threads" ON public.comment_threads;

-- Thread metadata is public (comment counts, depths)
CREATE POLICY "Anyone can read comment threads"
  ON public.comment_threads FOR SELECT
  USING (true);

-- Only service role can write thread records (maintained server-side)
CREATE POLICY "Service role manages threads"
  ON public.comment_threads
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- SCHEMA_VERSIONS
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages schema versions" ON public.schema_versions;

-- Schema version tracking is internal — no direct user access
CREATE POLICY "Service role manages schema versions"
  ON public.schema_versions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- SUBSCRIPTIONS: replace open INSERT/UPDATE policies with service-role-only ones
-- (all subscription writes go through server-side edge functions / API routes
--  that use the service role key — no client should write directly)
DROP POLICY IF EXISTS "System can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

CREATE POLICY "Service role can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- WEBHOOK_EVENTS: idempotency table for Paystack webhook deduplication.
-- Stores a SHA-256 hex digest of each raw payload so replayed events are
-- rejected before any state mutation occurs.
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, payload_hash)
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages webhook events" ON public.webhook_events;

CREATE POLICY "Service role manages webhook events"
  ON public.webhook_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Prune records older than 7 days to keep the table small.
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx
  ON public.webhook_events (received_at DESC);
