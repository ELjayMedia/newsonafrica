-- =============================================================================
-- Migration: Align Supabase schema with codebase expectations
-- Date: 2026-04-01
-- Description: Fixes profiles table, creates missing tables, fixes triggers
-- =============================================================================

-- 1. PROFILES TABLE: rename display_name → full_name, add missing columns
ALTER TABLE public.profiles RENAME COLUMN display_name TO full_name;
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS interests text[],
  ADD COLUMN IF NOT EXISTS preferences jsonb,
  ADD COLUMN IF NOT EXISTS is_admin boolean,
  ADD COLUMN IF NOT EXISTS onboarded boolean,
  ADD COLUMN IF NOT EXISTS role text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique ON public.profiles (handle) WHERE handle IS NOT NULL;

-- 2. USER_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'system',
  language text DEFAULT 'en',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  sections text[],
  blocked_topics text[],
  countries text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_preferences_insert ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_update ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  renewal_date timestamptz,
  payment_provider text NOT NULL DEFAULT 'paystack',
  payment_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY subscriptions_insert ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 4. BOOKMARKS: add missing columns
ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS featured_image jsonb,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[];

-- 5. BOOKMARK_COLLECTIONS: add missing columns
ALTER TABLE public.bookmark_collections
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS sort_index integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 6. BOOKMARK_USER_COUNTERS: rename columns + add missing
ALTER TABLE public.bookmark_user_counters RENAME COLUMN total TO total_count;
ALTER TABLE public.bookmark_user_counters RENAME COLUMN unread TO unread_count;
ALTER TABLE public.bookmark_user_counters
  ADD COLUMN IF NOT EXISTS read_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collections_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collection_unread_counts jsonb;

-- 7. COMMENTS: add missing moderation columns
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reported_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS report_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_rich_text boolean DEFAULT false;

-- 8. COMMENT_REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_reactions_select ON public.comment_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY comment_reactions_insert ON public.comment_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY comment_reactions_delete ON public.comment_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. USER_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  theme text DEFAULT 'system',
  language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_settings_insert ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_update ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. FIX BOOKMARK COUNTER FUNCTIONS (column renames)
CREATE OR REPLACE FUNCTION public.bookmark_user_counters_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.bookmark_user_counters(user_id, total_count, unread_count, updated_at)
    VALUES (NEW.user_id, 1, CASE WHEN NEW.read_state = 'unread' THEN 1 ELSE 0 END, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_count = public.bookmark_user_counters.total_count + 1,
      unread_count = public.bookmark_user_counters.unread_count + (CASE WHEN NEW.read_state = 'unread' THEN 1 ELSE 0 END),
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bookmark_user_counters SET
      total_count = GREATEST(total_count - 1, 0),
      unread_count = GREATEST(unread_count - (CASE WHEN OLD.read_state = 'unread' THEN 1 ELSE 0 END), 0),
      updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.read_state <> NEW.read_state THEN
      UPDATE public.bookmark_user_counters SET
        unread_count = unread_count + (CASE WHEN NEW.read_state = 'unread' THEN 1 WHEN OLD.read_state = 'unread' THEN -1 ELSE 0 END),
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_bm_counters(p_user uuid, p_total_delta int, p_unread_delta int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.ensure_bm_counter_row(p_user);
  UPDATE public.bookmark_user_counters c
     SET total_count  = GREATEST(c.total_count  + COALESCE(p_total_delta, 0),  0),
         unread_count = GREATEST(c.unread_count + COALESCE(p_unread_delta, 0), 0),
         updated_at = now()
   WHERE c.user_id = p_user;
END;
$$;

-- 11. CONSOLIDATE PROFILE CREATION TRIGGERS
DROP TRIGGER IF EXISTS create_profile_for_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
