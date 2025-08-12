import { createAdminClient } from "./supabase"

export type Migration = {
  id: string
  name: string
  sql: string
  description?: string
}

// List of all migrations
export const migrations: Migration[] = [
  {
    id: "001_initial_schema",
    name: "Initial Schema",
    description: "Creates the initial database schema",
    sql: `
      -- Create profiles table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Set up RLS for profiles
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

      -- Create policy for profiles
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view all profiles'
        ) THEN
          CREATE POLICY "Users can view all profiles" ON public.profiles
            FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
        ) THEN
          CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
        END IF;
      END
      $$;

      -- Create migrations table to track applied migrations
      CREATE TABLE IF NOT EXISTS public.migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_by UUID REFERENCES auth.users(id)
      );
    `,
  },
  {
    id: "002_bookmarks",
    name: "Bookmarks",
    description: "Creates the bookmarks table",
    sql: `
      -- Create bookmarks table
      CREATE TABLE IF NOT EXISTS public.bookmarks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL,
        title TEXT,
        slug TEXT,
        excerpt TEXT,
        featured_image JSONB,
        category TEXT,
        tags TEXT[],
        read_status TEXT DEFAULT 'unread' CHECK (read_status IN ('read','unread')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, post_id)
      );

      -- Set up RLS for bookmarks
      ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

      -- Create policies for bookmarks
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can view own bookmarks'
        ) THEN
          CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
            FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can create own bookmarks'
        ) THEN
          CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmarks' AND policyname = 'Users can delete own bookmarks'
        ) THEN
          CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
            FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END
      $$;
    `,
  },
  {
    id: "003_comments",
    name: "Comments",
    description: "Creates the comments table",
    sql: `
      -- Create comments table
      CREATE TABLE IF NOT EXISTS public.comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reported_by UUID REFERENCES auth.users(id),
        report_reason TEXT,
        reviewed_at TIMESTAMPTZ,
        reviewed_by UUID REFERENCES auth.users(id),
        is_rich_text BOOLEAN NOT NULL DEFAULT false,
        reaction_count INTEGER NOT NULL DEFAULT 0
      );

      -- Create indexes for comments
      CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
      CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
      CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);
      CREATE INDEX IF NOT EXISTS comments_status_idx ON public.comments(status);
      CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at);

      -- Set up RLS for comments
      ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

      -- Create policies for comments
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Anyone can view active comments'
        ) THEN
          CREATE POLICY "Anyone can view active comments" ON public.comments
            FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can create own comments'
        ) THEN
          CREATE POLICY "Users can create own comments" ON public.comments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can update own comments'
        ) THEN
          CREATE POLICY "Users can update own comments" ON public.comments
            FOR UPDATE USING (auth.uid() = user_id AND status = 'active');
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete own comments'
        ) THEN
          CREATE POLICY "Users can delete own comments" ON public.comments
            FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END
      $$;
    `,
  },
  {
    id: "004_comment_reactions",
    name: "Comment Reactions",
    description: "Creates the comment reactions table",
    sql: `
      -- Create comment_reactions table
      CREATE TABLE IF NOT EXISTS public.comment_reactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(comment_id, user_id)
      );

      -- Create indexes for comment_reactions
      CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON public.comment_reactions(comment_id);
      CREATE INDEX IF NOT EXISTS comment_reactions_user_id_idx ON public.comment_reactions(user_id);

      -- Set up RLS for comment_reactions
      ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

      -- Create policies for comment_reactions
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comment_reactions' AND policyname = 'Anyone can view reactions'
        ) THEN
          CREATE POLICY "Anyone can view reactions" ON public.comment_reactions
            FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comment_reactions' AND policyname = 'Users can create own reactions'
        ) THEN
          CREATE POLICY "Users can create own reactions" ON public.comment_reactions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comment_reactions' AND policyname = 'Users can update own reactions'
        ) THEN
          CREATE POLICY "Users can update own reactions" ON public.comment_reactions
            FOR UPDATE USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comment_reactions' AND policyname = 'Users can delete own reactions'
        ) THEN
          CREATE POLICY "Users can delete own reactions" ON public.comment_reactions
            FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END
      $$;

      -- Create function to update comment reaction count
      CREATE OR REPLACE FUNCTION update_comment_reaction_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE public.comments
          SET reaction_count = reaction_count + 1
          WHERE id = NEW.comment_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE public.comments
          SET reaction_count = reaction_count - 1
          WHERE id = OLD.comment_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for comment_reactions
      DROP TRIGGER IF EXISTS update_comment_reaction_count_trigger ON public.comment_reactions;
      CREATE TRIGGER update_comment_reaction_count_trigger
      AFTER INSERT OR DELETE ON public.comment_reactions
      FOR EACH ROW
      EXECUTE FUNCTION update_comment_reaction_count();
    `,
  },
  {
    id: "005_notifications",
    name: "Notifications",
    description: "Creates the notifications table",
    sql: `
      -- Create notifications table
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Create indexes for notifications
      CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
      CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
      CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

      -- Set up RLS for notifications
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

      -- Create policies for notifications
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
        ) THEN
          CREATE POLICY "Users can view own notifications" ON public.notifications
            FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
        ) THEN
          CREATE POLICY "Users can update own notifications" ON public.notifications
            FOR UPDATE USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete own notifications'
        ) THEN
          CREATE POLICY "Users can delete own notifications" ON public.notifications
            FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END
      $$;

      -- Enable realtime for notifications
      BEGIN;
        DROP PUBLICATION IF EXISTS supabase_realtime;
        CREATE PUBLICATION supabase_realtime FOR TABLE notifications;
      COMMIT;
    `,
  },
  {
    id: "006_user_settings",
    name: "User Settings",
    description: "Creates the user settings table",
    sql: `
      -- Create user_settings table
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        push_notifications BOOLEAN NOT NULL DEFAULT true,
        theme TEXT NOT NULL DEFAULT 'system',
        language TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Set up RLS for user_settings
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

      -- Create policies for user_settings
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings'
        ) THEN
          CREATE POLICY "Users can view own settings" ON public.user_settings
            FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings'
        ) THEN
          CREATE POLICY "Users can update own settings" ON public.user_settings
            FOR UPDATE USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings'
        ) THEN
          CREATE POLICY "Users can insert own settings" ON public.user_settings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
      END
      $$;

      -- Create function to automatically create user settings on user creation
      CREATE OR REPLACE FUNCTION create_user_settings()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.user_settings (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for user creation
      DROP TRIGGER IF EXISTS create_user_settings_trigger ON auth.users;
      CREATE TRIGGER create_user_settings_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_settings();
    `,
  },
  {
    id: "007_performance_optimizations",
    name: "Performance Optimizations",
    description: "Adds performance optimizations",
    sql: `
      -- Add indexes for common queries
      CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
      CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
      CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at);
      
      -- Add partial index for active comments
      CREATE INDEX IF NOT EXISTS comments_active_idx ON public.comments(post_id, created_at)
      WHERE status = 'active';
      
      -- Add index for notifications filtering
      CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);
      
      -- Add index for user settings
      CREATE INDEX IF NOT EXISTS user_settings_theme_idx ON public.user_settings(theme);
      CREATE INDEX IF NOT EXISTS user_settings_language_idx ON public.user_settings(language);
      
      -- Optimize vacuum settings for frequently updated tables
      ALTER TABLE public.notifications SET (autovacuum_vacuum_scale_factor = 0.05);
      ALTER TABLE public.comments SET (autovacuum_vacuum_scale_factor = 0.05);
      
      -- Create materialized view for comment counts
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.post_comment_counts AS
      SELECT 
        post_id,
        COUNT(*) FILTER (WHERE status = 'active') AS active_count,
        COUNT(*) AS total_count
      FROM public.comments
      GROUP BY post_id;
      
      -- Create index on materialized view
      CREATE UNIQUE INDEX IF NOT EXISTS post_comment_counts_post_id_idx 
      ON public.post_comment_counts(post_id);
      
      -- Create function to refresh materialized view
      CREATE OR REPLACE FUNCTION refresh_post_comment_counts()
      RETURNS TRIGGER AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.post_comment_counts;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create trigger to refresh materialized view
      DROP TRIGGER IF EXISTS refresh_post_comment_counts_trigger ON public.comments;
      CREATE TRIGGER refresh_post_comment_counts_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.comments
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_post_comment_counts();
    `,
  },
  {
    id: "008_bookmark_collections",
    name: "Bookmark Collections",
    description: "Creates bookmark collections table and links bookmarks",
    sql: `
      -- Create bookmark collections table
      CREATE TABLE IF NOT EXISTS public.bookmark_collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Enable RLS for bookmark collections
      ALTER TABLE public.bookmark_collections ENABLE ROW LEVEL SECURITY;

      -- Policies for bookmark collections
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmark_collections' AND policyname = 'Users can view own bookmark collections'
        ) THEN
          CREATE POLICY "Users can view own bookmark collections" ON public.bookmark_collections
            FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmark_collections' AND policyname = 'Users can create own bookmark collections'
        ) THEN
          CREATE POLICY "Users can create own bookmark collections" ON public.bookmark_collections
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmark_collections' AND policyname = 'Users can update own bookmark collections'
        ) THEN
          CREATE POLICY "Users can update own bookmark collections" ON public.bookmark_collections
            FOR UPDATE USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'bookmark_collections' AND policyname = 'Users can delete own bookmark collections'
        ) THEN
          CREATE POLICY "Users can delete own bookmark collections" ON public.bookmark_collections
            FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END
      $$;

      -- Add collection_id column to bookmarks table
      ALTER TABLE public.bookmarks
      ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.bookmark_collections(id) ON DELETE SET NULL;
    `,
  },
]

// Function to apply a single migration
export async function applyMigration(migration: Migration, userId?: string) {
  const supabase = createAdminClient()

  try {
    // Check if migration has already been applied
    const { data: existingMigration, error: checkError } = await supabase
      .from("migrations")
      .select("id")
      .eq("id", migration.id)
      .maybeSingle()

    if (checkError) {
      console.error(`Error checking migration ${migration.id}:`, checkError)
      throw checkError
    }

    // If migration already exists, skip it
    if (existingMigration) {
      console.log(`Migration ${migration.id} already applied, skipping`)
      return { success: true, skipped: true }
    }

    // Apply the migration
    const { error: sqlError } = await supabase.rpc("exec_sql", { sql: migration.sql })

    if (sqlError) {
      console.error(`Error applying migration ${migration.id}:`, sqlError)
      throw sqlError
    }

    // Record the migration
    const { error: recordError } = await supabase.from("migrations").insert({
      id: migration.id,
      name: migration.name,
      applied_by: userId,
    })

    if (recordError) {
      console.error(`Error recording migration ${migration.id}:`, recordError)
      throw recordError
    }

    console.log(`Successfully applied migration ${migration.id}`)
    return { success: true, skipped: false }
  } catch (error) {
    console.error(`Failed to apply migration ${migration.id}:`, error)
    throw error
  }
}

// Function to apply all pending migrations
export async function applyPendingMigrations(userId?: string) {
  const supabase = createAdminClient()
  const results: Record<string, { success: boolean; skipped: boolean; error?: any }> = {}

  try {
    // Check if migrations table exists
    const { error: tableCheckError } = await supabase.from("migrations").select("id").limit(1)

    // If migrations table doesn't exist, apply the first migration manually
    if (tableCheckError && tableCheckError.code === "PGRST116") {
      console.log("Migrations table doesn't exist, applying initial migration")

      const initialMigration = migrations[0]
      const { error: sqlError } = await supabase.rpc("exec_sql", { sql: initialMigration.sql })

      if (sqlError) {
        console.error(`Error applying initial migration:`, sqlError)
        results[initialMigration.id] = { success: false, skipped: false, error: sqlError }
        return results
      }

      // Record the migration
      const { error: recordError } = await supabase.from("migrations").insert({
        id: initialMigration.id,
        name: initialMigration.name,
        applied_by: userId,
      })

      if (recordError) {
        console.error(`Error recording initial migration:`, recordError)
        results[initialMigration.id] = { success: false, skipped: false, error: recordError }
        return results
      }

      results[initialMigration.id] = { success: true, skipped: false }
    }

    // Get list of applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase.from("migrations").select("id")

    if (fetchError) {
      console.error("Error fetching applied migrations:", fetchError)
      throw fetchError
    }

    const appliedMigrationIds = new Set((appliedMigrations || []).map((m) => m.id))

    // Apply each pending migration in order
    for (const migration of migrations) {
      if (!appliedMigrationIds.has(migration.id)) {
        try {
          const result = await applyMigration(migration, userId)
          results[migration.id] = result
        } catch (error) {
          results[migration.id] = { success: false, skipped: false, error }
          // Don't break on error, continue with next migration
          console.error(`Error applying migration ${migration.id}, continuing with next`)
        }
      } else {
        results[migration.id] = { success: true, skipped: true }
      }
    }

    return results
  } catch (error) {
    console.error("Error applying migrations:", error)
    throw error
  }
}

// Function to get migration status
export async function getMigrationStatus() {
  const supabase = createAdminClient()

  try {
    // Check if migrations table exists
    const { error: tableCheckError } = await supabase.from("migrations").select("id").limit(1)

    // If migrations table doesn't exist, return empty list
    if (tableCheckError && tableCheckError.code === "PGRST116") {
      return {
        applied: [],
        pending: migrations.map((m) => m.id),
        total: migrations.length,
        appliedCount: 0,
        pendingCount: migrations.length,
      }
    }

    // Get list of applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from("migrations")
      .select("id, name, applied_at, applied_by")
      .order("applied_at", { ascending: true })

    if (fetchError) {
      console.error("Error fetching applied migrations:", fetchError)
      throw fetchError
    }

    const appliedMigrationIds = new Set((appliedMigrations || []).map((m) => m.id))
    const pendingMigrations = migrations.filter((m) => !appliedMigrationIds.has(m.id))

    return {
      applied: appliedMigrations || [],
      pending: pendingMigrations.map((m) => ({ id: m.id, name: m.name })),
      total: migrations.length,
      appliedCount: appliedMigrations?.length || 0,
      pendingCount: pendingMigrations.length,
    }
  } catch (error) {
    console.error("Error getting migration status:", error)
    throw error
  }
}

// Function to create the exec_sql function if it doesn't exist
export async function createExecSqlFunction() {
  const supabase = createAdminClient()

  try {
    // Create the exec_sql function
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    })

    if (error) {
      // If the function doesn't exist yet, create it directly
      if (error.message.includes("function exec_sql(text) does not exist")) {
        const { error: directError } = await supabase.from("_rpc").select("*").eq("name", "exec_sql")

        if (directError) {
          console.error("Error creating exec_sql function:", directError)
          throw directError
        }

        return { success: true }
      }

      console.error("Error creating exec_sql function:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Error creating exec_sql function:", error)
    throw error
  }
}
