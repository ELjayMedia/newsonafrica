-- Ensure pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  email TEXT,
  bio TEXT,
  country TEXT,
  location TEXT,
  interests TEXT[],
  preferences JSONB,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  onboarded BOOLEAN DEFAULT FALSE,
  role TEXT
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN display_name TO full_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'country_pref'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN country_pref TO country;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language_pref'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN language_pref;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[],
  ADD COLUMN IF NOT EXISTS preferences JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role TEXT;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.profiles ALTER COLUMN is_admin SET DEFAULT FALSE;
ALTER TABLE public.profiles ALTER COLUMN onboarded SET DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_key ON public.profiles (handle);

-- Profiles RLS and triggers
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are readable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are updatable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  INSERT INTO public.profiles (id, username, email, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  country TEXT,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  featured_image JSONB,
  category TEXT,
  tags TEXT[],
  read_status TEXT DEFAULT 'unread',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS featured_image JSONB,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS read_status TEXT DEFAULT 'unread',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.bookmarks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bookmarks ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.bookmarks ALTER COLUMN read_status SET DEFAULT 'unread';

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON public.bookmarks (created_at DESC);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookmarks are readable by owner" ON public.bookmarks;
DROP POLICY IF EXISTS "Bookmarks are manageable by owner" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON public.bookmarks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  reported_by UUID,
  report_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  is_rich_text BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reported_by UUID,
  ADD COLUMN IF NOT EXISTS report_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reaction_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_rich_text BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.comments ALTER COLUMN reaction_count SET DEFAULT 0;
ALTER TABLE public.comments ALTER COLUMN is_rich_text SET DEFAULT FALSE;
ALTER TABLE public.comments ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_parent_id_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE SET NULL;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_reported_by_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_reviewed_by_fkey;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments (created_at DESC);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments (parent_id);
CREATE INDEX IF NOT EXISTS comments_status_idx ON public.comments (status);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view active comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

CREATE POLICY "Anyone can view active comments"
  ON public.comments FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  payment_provider TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.subscriptions ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN plan SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN payment_provider SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN payment_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.subscriptions ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create subscriptions"
  ON public.subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions"
  ON public.subscriptions FOR UPDATE USING (true);

-- USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sections TEXT[],
  blocked_topics TEXT[],
  countries TEXT[]
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COUNTRIES LOOKUP TABLE
CREATE TABLE IF NOT EXISTS public.countries (
  iso TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  wp_term_id INTEGER,
  slug TEXT
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read countries" ON public.countries;
DROP POLICY IF EXISTS "Service role can manage countries" ON public.countries;

CREATE POLICY "Anyone can read countries"
  ON public.countries FOR SELECT USING (true);

CREATE POLICY "Service role can manage countries"
  ON public.countries USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
    WHEN duplicate_object THEN
      NULL;
  END;
END;
$$;
