-- Provide column introspection helper used by comment-service
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS TABLE(exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = column_exists.table_name
      AND column_name = column_exists.column_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.column_exists TO authenticated;
