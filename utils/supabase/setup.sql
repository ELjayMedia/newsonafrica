-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  email TEXT,
  bio TEXT,
  country TEXT,
  interests TEXT[],
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reaction_count INTEGER DEFAULT 0,
  is_rich_text BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create comment_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_reactions table
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  related_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schema_versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  script TEXT
);

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  payment_provider TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies
-- Profiles: Users can read any profile but only update their own
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Comments: Everyone can view active comments
CREATE POLICY "Anyone can view active comments" 
  ON public.comments FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create comments" 
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON public.comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Reactions: Users can view all reactions but only manage their own
CREATE POLICY "Anyone can view comment reactions" 
  ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions" 
  ON public.comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
  ON public.comment_reactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
  ON public.comment_reactions FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Users can only access their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Systems can create notifications for users" 
  ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: Users can view/update their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create subscriptions" 
  ON public.subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" 
  ON public.subscriptions FOR UPDATE USING (true);

-- Create functions
-- Function to automatically set updated_at when a profile is updated
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 
             NEW.raw_user_meta_data->>'name',
             NEW.raw_user_meta_data->>'full_name', 
             NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
