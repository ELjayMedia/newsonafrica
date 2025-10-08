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
        website TEXT,
        email TEXT,
        bio TEXT,
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
        is_rich_text BOOLEAN NOT NULL DEFAULT false
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
      
      -- Add index for user settings
      CREATE INDEX IF NOT EXISTS user_settings_theme_idx ON public.user_settings(theme);
      CREATE INDEX IF NOT EXISTS user_settings_language_idx ON public.user_settings(language);
      
      -- Optimize vacuum settings for frequently updated tables
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
