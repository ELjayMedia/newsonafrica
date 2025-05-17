import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    // Check if user is authenticated and is an admin
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // First, create the column_exists function if it doesn't exist
    const createColumnExistsSQL = `
      CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = $1
          AND column_name = $2
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    await supabase.rpc("exec_sql", { sql: createColumnExistsSQL }).catch((error) => {
      console.error("Error creating column_exists function:", error)
      // Continue even if this fails, as it might already exist
    })

    // Create the migration function
    const migrationFunctionSQL = `
      CREATE OR REPLACE FUNCTION migrate_comments_table()
      RETURNS JSONB AS $$
      DECLARE
        migration_results JSONB := '{}'::JSONB;
        column_added BOOLEAN;
      BEGIN
        -- Add status column if it doesn't exist
        IF NOT column_exists('comments', 'status') THEN
          ALTER TABLE public.comments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
          migration_results := migration_results || '{"status": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"status": "already_exists"}'::JSONB;
        END IF;

        -- Add is_rich_text column if it doesn't exist
        IF NOT column_exists('comments', 'is_rich_text') THEN
          ALTER TABLE public.comments ADD COLUMN is_rich_text BOOLEAN NOT NULL DEFAULT false;
          migration_results := migration_results || '{"is_rich_text": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"is_rich_text": "already_exists"}'::JSONB;
        END IF;

        -- Add reaction_count column if it doesn't exist
        IF NOT column_exists('comments', 'reaction_count') THEN
          ALTER TABLE public.comments ADD COLUMN reaction_count INTEGER NOT NULL DEFAULT 0;
          migration_results := migration_results || '{"reaction_count": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reaction_count": "already_exists"}'::JSONB;
        END IF;

        -- Add reported_by column if it doesn't exist
        IF NOT column_exists('comments', 'reported_by') THEN
          ALTER TABLE public.comments ADD COLUMN reported_by UUID REFERENCES auth.users(id);
          migration_results := migration_results || '{"reported_by": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reported_by": "already_exists"}'::JSONB;
        END IF;

        -- Add report_reason column if it doesn't exist
        IF NOT column_exists('comments', 'report_reason') THEN
          ALTER TABLE public.comments ADD COLUMN report_reason TEXT;
          migration_results := migration_results || '{"report_reason": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"report_reason": "already_exists"}'::JSONB;
        END IF;

        -- Add reviewed_at column if it doesn't exist
        IF NOT column_exists('comments', 'reviewed_at') THEN
          ALTER TABLE public.comments ADD COLUMN reviewed_at TIMESTAMPTZ;
          migration_results := migration_results || '{"reviewed_at": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reviewed_at": "already_exists"}'::JSONB;
        END IF;

        -- Add reviewed_by column if it doesn't exist
        IF NOT column_exists('comments', 'reviewed_by') THEN
          ALTER TABLE public.comments ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
          migration_results := migration_results || '{"reviewed_by": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reviewed_by": "already_exists"}'::JSONB;
        END IF;

        -- Create index on status column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'comments' AND indexname = 'comments_status_idx'
        ) THEN
          CREATE INDEX comments_status_idx ON public.comments(status);
          migration_results := migration_results || '{"status_index": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"status_index": "already_exists"}'::JSONB;
        END IF;

        -- Create index on reaction_count column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'comments' AND indexname = 'comments_reaction_count_idx'
        ) THEN
          CREATE INDEX comments_reaction_count_idx ON public.comments(reaction_count);
          migration_results := migration_results || '{"reaction_count_index": "added"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reaction_count_index": "already_exists"}'::JSONB;
        END IF;

        -- Create or update comment reactions table if needed
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'comment_reactions'
        ) THEN
          CREATE TABLE public.comment_reactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(comment_id, user_id)
          );
          
          -- Create indexes for comment_reactions
          CREATE INDEX comment_reactions_comment_id_idx ON public.comment_reactions(comment_id);
          CREATE INDEX comment_reactions_user_id_idx ON public.comment_reactions(user_id);
          
          -- Set up RLS for comment_reactions
          ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
          
          -- Create policies for comment_reactions
          CREATE POLICY "Anyone can view reactions" 
            ON public.comment_reactions
            FOR SELECT USING (true);
            
          CREATE POLICY "Users can create own reactions" 
            ON public.comment_reactions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
          CREATE POLICY "Users can update own reactions" 
            ON public.comment_reactions
            FOR UPDATE USING (auth.uid() = user_id);
            
          CREATE POLICY "Users can delete own reactions" 
            ON public.comment_reactions
            FOR DELETE USING (auth.uid() = user_id);
            
          migration_results := migration_results || '{"comment_reactions_table": "created"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"comment_reactions_table": "already_exists"}'::JSONB;
        END IF;

        -- Create trigger function to update reaction count if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'update_comment_reaction_count'
        ) THEN
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
          
          migration_results := migration_results || '{"reaction_count_trigger_function": "created"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reaction_count_trigger_function": "already_exists"}'::JSONB;
        END IF;

        -- Create trigger if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_comment_reaction_count_trigger'
        ) THEN
          DROP TRIGGER IF EXISTS update_comment_reaction_count_trigger ON public.comment_reactions;
          CREATE TRIGGER update_comment_reaction_count_trigger
          AFTER INSERT OR DELETE ON public.comment_reactions
          FOR EACH ROW
          EXECUTE FUNCTION update_comment_reaction_count();
          
          migration_results := migration_results || '{"reaction_count_trigger": "created"}'::JSONB;
        ELSE
          migration_results := migration_results || '{"reaction_count_trigger": "already_exists"}'::JSONB;
        END IF;

        -- Return the migration results
        RETURN migration_results;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    await supabase.rpc("exec_sql", { sql: migrationFunctionSQL }).catch((error) => {
      console.error("Error creating migration function:", error)
      throw error
    })

    // Run the migration
    const { data: migrationResults, error: migrationError } = await supabase.rpc("migrate_comments_table")

    if (migrationError) {
      console.error("Error running migration:", migrationError)
      return NextResponse.json({ error: migrationError.message }, { status: 500 })
    }

    // Record the migration in the migrations table
    const { error: recordError } = await supabase.from("migrations").insert({
      id: "comments_table_columns",
      name: "Add missing columns to comments table",
      applied_by: session.user.id,
    })

    if (recordError) {
      console.error("Error recording migration:", recordError)
      // Continue even if recording fails
    }

    return NextResponse.json({
      success: true,
      message: "Comments table migration completed successfully",
      results: migrationResults,
    })
  } catch (error) {
    console.error("Error in migrate-comments API route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
