-- Enhanced bookmarks table with new features
ALTER TABLE bookmarks 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS read_status TEXT DEFAULT 'unread' CHECK (read_status IN ('read', 'unread')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_category ON bookmarks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_status ON bookmarks(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_search ON bookmarks USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(notes, '')));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookmark_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_bookmark_updated_at ON bookmarks;
CREATE TRIGGER trigger_update_bookmark_updated_at
    BEFORE UPDATE ON bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_bookmark_updated_at();

-- RLS policies for enhanced features
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

CREATE POLICY "Users can view their own bookmarks" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get bookmark statistics
CREATE OR REPLACE FUNCTION get_bookmark_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'unread', COUNT(*) FILTER (WHERE read_status != 'read'),
        'categories', json_object_agg(category, category_count)
    ) INTO result
    FROM (
        SELECT 
            category,
            COUNT(*) as category_count
        FROM bookmarks 
        WHERE user_id = user_uuid AND category IS NOT NULL
        GROUP BY category
    ) category_stats,
    (SELECT COUNT(*) FROM bookmarks WHERE user_id = user_uuid) total_count;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
