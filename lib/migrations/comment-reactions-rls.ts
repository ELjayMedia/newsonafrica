import { supabase } from "@/lib/supabase/browser-helpers"

async function runSql(sql: string): Promise<void> {
  await (supabase as unknown as { query: (statement: string) => Promise<unknown> }).query(sql)
}

export const COMMENT_REACTIONS_RLS_MIGRATION = {
  version: "1.0.1",
  name: "comment_reactions_rls",
  description: "Add RLS policies for comment reactions",

  up: async () => {
    // Create comment_reactions table if it doesn't exist
    await runSql(`
      CREATE TABLE IF NOT EXISTS public.comment_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        reaction_type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      );
    `)

    // Enable RLS on comment_reactions table
    await runSql(`
      ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
    `)

    // Create RLS policies for comment_reactions
    await runSql(`
      CREATE POLICY "Anyone can view comment reactions" 
        ON public.comment_reactions FOR SELECT USING (true);
    `)

    await runSql(`
      CREATE POLICY "Users can add their own reactions" 
        ON public.comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    `)

    await runSql(`
      CREATE POLICY "Users can update their own reactions" 
        ON public.comment_reactions FOR UPDATE USING (auth.uid() = user_id);
    `)

    await runSql(`
      CREATE POLICY "Users can delete their own reactions" 
        ON public.comment_reactions FOR DELETE USING (auth.uid() = user_id);
    `)

    return true
  },

  down: async () => {
    // Drop RLS policies
    await runSql(`
      DROP POLICY IF EXISTS "Anyone can view comment reactions" ON public.comment_reactions;
    `)

    await runSql(`
      DROP POLICY IF EXISTS "Users can add their own reactions" ON public.comment_reactions;
    `)

    await runSql(`
      DROP POLICY IF EXISTS "Users can update their own reactions" ON public.comment_reactions;
    `)

    await runSql(`
      DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;
    `)

    return true
  },
}
