import { createHash } from "node:crypto"

export interface Migration {
  version: string
  description: string
  scriptName: string
  sql: string
  dependencies?: string[]
}

// Helper function to generate a checksum for a migration
export function generateChecksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex")
}

// Define all migrations here
export const migrations: Migration[] = [
  {
    version: "1.0.0",
    description: "Initial schema setup",
    scriptName: "initial-schema.sql",
    sql: `
      -- Create initial tables if they don't exist
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username TEXT UNIQUE,
        full_name TEXT,
        avatar_url TEXT,
        website TEXT,
        email TEXT,
        bio TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
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
      END
      $$;
    `,
  },
  {
    version: "1.1.0",
    description: "Add comments table",
    scriptName: "comments-table.sql",
    dependencies: ["1.0.0"],
    sql: `
      -- Create comments table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      -- Create indexes for comments
      CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
      CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
      CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);
      CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at);
      
      -- Set up RLS for comments
      ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
      
      -- Create policies for comments
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Anyone can view comments'
        ) THEN
          CREATE POLICY "Anyone can view comments" ON public.comments
            FOR SELECT USING (true);
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
            FOR UPDATE USING (auth.uid() = user_id);
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
    version: "1.2.0",
    description: "Add comment moderation fields",
    scriptName: "comment-moderation.sql",
    dependencies: ["1.1.0"],
    sql: `
      -- Add status column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'status'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'reported_by'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN reported_by UUID REFERENCES auth.users(id);
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'report_reason'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN report_reason TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'reviewed_at'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN reviewed_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'reviewed_by'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
        END IF;
      END
      $$;
      
      -- Create index on status column if it doesn't exist
      CREATE INDEX IF NOT EXISTS comments_status_idx ON public.comments(status);
      
      -- Update RLS policies for moderation
      DO $$
      BEGIN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
        
        -- Create new policy for viewing comments
        CREATE POLICY "Anyone can view active comments" ON public.comments
          FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
      END
      $$;
    `,
  },
  {
    version: "1.3.0",
    description: "Add comment reactions",
    scriptName: "comment-reactions.sql",
    dependencies: ["1.2.0"],
    sql: `
      -- Add is_rich_text column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'is_rich_text'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN is_rich_text BOOLEAN NOT NULL DEFAULT false;
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'comments' AND column_name = 'reaction_count'
        ) THEN
          ALTER TABLE public.comments ADD COLUMN reaction_count INTEGER NOT NULL DEFAULT 0;
        END IF;
      END
      $$;
      
      -- Create comment_reactions table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.comment_reactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      
      -- Create trigger function to update reaction count
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
    version: "1.4.0",
    description: "Add bookmarks table",
    scriptName: "bookmarks-table.sql",
    dependencies: ["1.0.0"],
    sql: `
      -- Create bookmarks table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.bookmarks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL,
        title TEXT,
        slug TEXT,
        featuredImage JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      );
      
      -- Create indexes for bookmarks
      CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON public.bookmarks(created_at);
      
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
    version: "1.6.0",
    description: "Add user settings table",
    scriptName: "user-settings-table.sql",
    dependencies: ["1.0.0"],
    sql: `
      -- Create user_settings table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        push_notifications BOOLEAN NOT NULL DEFAULT true,
        theme TEXT NOT NULL DEFAULT 'system',
        language TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
]

// Get all available migration versions
export function getAvailableMigrationVersions(): string[] {
  return migrations.map((m) => m.version)
}

// Get a migration by version
export function getMigrationByVersion(version: string): Migration | undefined {
  return migrations.find((m) => m.version === version)
}

// Sort migrations topologically based on dependencies
export function sortMigrations(migrationList: Migration[]): Migration[] {
  const result: Migration[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  function visit(migration: Migration) {
    if (temp.has(migration.version)) {
      throw new Error(`Circular dependency detected in migrations: ${migration.version}`)
    }

    if (visited.has(migration.version)) {
      return
    }

    temp.add(migration.version)

    // Visit all dependencies first
    if (migration.dependencies) {
      for (const depVersion of migration.dependencies) {
        const depMigration = getMigrationByVersion(depVersion)
        if (depMigration) {
          visit(depMigration)
        } else {
          throw new Error(`Dependency not found: ${depVersion} required by ${migration.version}`)
        }
      }
    }

    temp.delete(migration.version)
    visited.add(migration.version)
    result.push(migration)
  }

  // Visit all migrations
  for (const migration of migrationList) {
    if (!visited.has(migration.version)) {
      visit(migration)
    }
  }

  return result
}

// Compare semantic versions
export function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split(".").map((p) => Number.parseInt(p, 10))
  const v2Parts = v2.split(".").map((p) => Number.parseInt(p, 10))

  // Ensure arrays have the same length
  while (v1Parts.length < v2Parts.length) v1Parts.push(0)
  while (v2Parts.length < v1Parts.length) v2Parts.push(0)

  // Compare each part
  for (let i = 0; i < v1Parts.length; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1
    if (v1Parts[i] < v2Parts[i]) return -1
  }

  return 0 // versions are equal
}
