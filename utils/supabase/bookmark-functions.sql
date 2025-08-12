-- Create a function to handle bookmark operations (add/remove/toggle)
CREATE OR REPLACE FUNCTION handle_bookmark(
  p_user_id UUID,
  p_post_id TEXT,
  p_title TEXT DEFAULT '',
  p_slug TEXT DEFAULT '',
  p_excerpt TEXT DEFAULT '',
  p_featured_image JSONB DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_read_status TEXT DEFAULT 'unread',
  p_notes TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'toggle'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_bookmark bookmarks%ROWTYPE;
  result JSONB;
BEGIN
  -- Check if bookmark exists
  SELECT * INTO existing_bookmark
  FROM bookmarks
  WHERE user_id = p_user_id AND post_id = p_post_id;

  IF p_action = 'add' OR (p_action = 'toggle' AND existing_bookmark.id IS NULL) THEN
    -- Add bookmark if it doesn't exist
    IF existing_bookmark.id IS NULL THEN
      INSERT INTO bookmarks (
        user_id,
        post_id,
        title,
        slug,
        excerpt,
        featured_image,
        category,
        tags,
        read_status,
        notes
      )
      VALUES (
        p_user_id,
        p_post_id,
        p_title,
        p_slug,
        p_excerpt,
        p_featured_image,
        p_category,
        p_tags,
        COALESCE(p_read_status, 'unread'),
        p_notes
      )
      RETURNING * INTO existing_bookmark;
      
      result := jsonb_build_object(
        'action', 'added',
        'bookmark', row_to_json(existing_bookmark)
      );
    ELSE
      result := jsonb_build_object(
        'action', 'exists',
        'bookmark', row_to_json(existing_bookmark)
      );
    END IF;
    
  ELSIF p_action = 'remove' OR (p_action = 'toggle' AND existing_bookmark.id IS NOT NULL) THEN
    -- Remove bookmark if it exists
    IF existing_bookmark.id IS NOT NULL THEN
      DELETE FROM bookmarks
      WHERE user_id = p_user_id AND post_id = p_post_id;
      
      result := jsonb_build_object(
        'action', 'removed',
        'bookmark', row_to_json(existing_bookmark)
      );
    ELSE
      result := jsonb_build_object(
        'action', 'not_found',
        'bookmark', NULL
      );
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_bookmark TO authenticated;
