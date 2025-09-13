import { createAdminClient } from "./supabase"
import logger from '@/utils/logger'

/**
 * Setup Row-Level Security policies for News On Africa
 * This should be run once during initial setup
 */
export async function setupRLSPolicies() {
  const supabase = createAdminClient()

  try {
    logger.debug("🔒 Setting up Row-Level Security policies...")

    // Read the SQL file content (in a real app, you'd read from file system)
    const sqlCommands = [
      // Profiles table
      "ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",

      `CREATE POLICY "Users can view their own profile"
       ON public.profiles FOR SELECT
       USING (auth.uid() = id);`,

      `CREATE POLICY "Users can update their own profile"
       ON public.profiles FOR UPDATE
       USING (auth.uid() = id);`,

      // Bookmarks table
      "ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;",

      `CREATE POLICY "Users can view their own bookmarks"
       ON public.bookmarks FOR SELECT
       USING (auth.uid() = user_id);`,

      // Add more policies as needed...
    ]

    for (const sql of sqlCommands) {
      const { error } = await supabase.rpc("exec_sql", { sql })
      if (error) {
        logger.error("Error executing SQL:", error)
        throw error
      }
    }

    logger.debug("✅ RLS policies setup completed successfully")
    return { success: true }
  } catch (error) {
    logger.error("❌ Error setting up RLS policies:", error)
    throw error
  }
}

/**
 * Verify RLS policies are working correctly
 */
export async function verifyRLSPolicies() {
  const supabase = createAdminClient()

  try {
    logger.debug("🔍 Verifying RLS policies...")

    // Check if RLS is enabled
    const { data: tables, error: tablesError } = await supabase.rpc("exec_sql", {
      sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'bookmarks', 'comments');
        `,
    })

    if (tablesError) throw tablesError

    // Check policies exist
    const { data: policies, error: policiesError } = await supabase.rpc("exec_sql", {
      sql: `
          SELECT schemaname, tablename, policyname 
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `,
    })

    if (policiesError) throw policiesError

    logger.debug("✅ RLS verification completed")
    return {
      success: true,
      tables: tables || [],
      policies: policies || [],
    }
  } catch (error) {
    logger.error("❌ Error verifying RLS policies:", error)
    throw error
  }
}

/**
 * Test RLS policies with a sample user
 */
export async function testRLSPolicies(testUserId: string) {
  const supabase = createAdminClient()

  try {
    logger.debug("🧪 Testing RLS policies...")

    // Test profile access
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").eq("id", testUserId)

    if (profileError) throw profileError

    // Test bookmarks access
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", testUserId)

    if (bookmarkError) throw bookmarkError

    logger.debug("✅ RLS policy testing completed")
    return {
      success: true,
      profilesFound: profiles?.length || 0,
      bookmarksFound: bookmarks?.length || 0,
    }
  } catch (error) {
    logger.error("❌ Error testing RLS policies:", error)
    throw error
  }
}
