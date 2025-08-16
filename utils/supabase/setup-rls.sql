-- This SQL should be run in the Supabase SQL Editor

-- Enable Row Level Security for bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create a function to set up bookmark policies
CREATE OR REPLACE FUNCTION setup_bookmark_policies()
RETURNS void AS $$
BEGIN
 -- Drop existing policies if they exist
 DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
 DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
 DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
 DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

 -- Create policies
 CREATE POLICY "Users can view their own bookmarks"
   ON bookmarks
   FOR SELECT
   USING (auth.uid() = user_id);

 CREATE POLICY "Users can create their own bookmarks"
   ON bookmarks
   FOR INSERT
   WITH CHECK (auth.uid() = user_id);

 CREATE POLICY "Users can update their own bookmarks"
   ON bookmarks
   FOR UPDATE
   USING (auth.uid() = user_id);

 CREATE POLICY "Users can delete their own bookmarks"
   ON bookmarks
   FOR DELETE
   USING (auth.uid() = user_id);
END;
$$ LANGUAGE plpgsql;

-- Create a function to enable RLS on a table
CREATE OR REPLACE FUNCTION enable_rls(table_name text)
RETURNS void AS $$
BEGIN
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql;

-- Run the function to set up policies
SELECT setup_bookmark_policies();
