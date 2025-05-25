-- Function to get table information
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'columns', jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable
        )
      ),
      'policies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'policyname', policyname,
            'permissive', permissive,
            'roles', roles,
            'cmd', cmd,
            'qual', qual,
            'with_check', with_check
          )
        )
        FROM pg_policies
        WHERE tablename = table_name
      )
    ) INTO result
  FROM information_schema.columns
  WHERE table_name = table_name;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_info TO authenticated;
