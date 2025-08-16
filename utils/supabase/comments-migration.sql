-- Comments Table Migration Script
-- This script adds missing columns to the comments table

-- Function to check if a column exists
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

-- Function to run the migration
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
    -- Fixed syntax for the trigger function
    EXECUTE '
    CREATE OR REPLACE FUNCTION update_comment_reaction_count()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      IF TG_OP = ''INSERT'' THEN
        UPDATE public.comments
        SET reaction_count = reaction_count + 1
        WHERE id = NEW.comment_id;
      ELSIF TG_OP = ''DELETE'' THEN
        UPDATE public.comments
        SET reaction_count = reaction_count - 1
        WHERE id = OLD.comment_id;
      END IF;
      RETURN NULL;
    END;
    $trigger$ LANGUAGE plpgsql;
    ';
    
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
