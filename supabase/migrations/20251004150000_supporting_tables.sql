-- Ensure pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- COMMENT REACTIONS
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON public.comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS comment_reactions_user_id_idx ON public.comment_reactions (user_id);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can add their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;

CREATE POLICY "Anyone can view comment reactions"
  ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON public.comment_reactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
      SET reaction_count = COALESCE(reaction_count, 0) + 1
      WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
      SET reaction_count = GREATEST(COALESCE(reaction_count, 0) - 1, 0)
      WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_reaction_count_trigger ON public.comment_reactions;
CREATE TRIGGER update_comment_reaction_count_trigger
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_reaction_count();

-- SCHEMA VERSIONS
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  script TEXT
);

-- USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_settings_theme_idx ON public.user_settings (theme);
CREATE INDEX IF NOT EXISTS user_settings_language_idx ON public.user_settings (language);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_user_settings_trigger ON auth.users;
CREATE TRIGGER create_user_settings_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_settings();

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions (status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON public.transactions (created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role manages transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role updates transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role reads transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role reads transactions"
  ON public.transactions FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates transactions"
  ON public.transactions FOR UPDATE USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- TRANSFERS
CREATE TABLE IF NOT EXISTS public.transfers (
  id TEXT PRIMARY KEY,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transfers_status_idx ON public.transfers (status);
CREATE INDEX IF NOT EXISTS transfers_created_at_idx ON public.transfers (created_at DESC);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role reads transfers" ON public.transfers;
DROP POLICY IF EXISTS "Service role manages transfers" ON public.transfers;

CREATE POLICY "Service role reads transfers"
  ON public.transfers FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages transfers"
  ON public.transfers FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates transfers"
  ON public.transfers FOR UPDATE USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_transfers_updated_at ON public.transfers;
CREATE TRIGGER set_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
