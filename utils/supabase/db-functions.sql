-- Function to check if an index exists
CREATE OR REPLACE FUNCTION check_index_exists(p_table text, p_index text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = p_table
    AND indexname = p_index
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Function to create an index
CREATE OR REPLACE FUNCTION create_index(p_table text, p_index text, p_columns text[], p_unique boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql text;
  v_columns text;
BEGIN
  -- Convert array to comma-separated string
  SELECT string_agg(quote_ident(column_name), ', ')
  FROM unnest(p_columns) AS column_name
  INTO v_columns;
  
  -- Build SQL statement
  IF p_unique THEN
    v_sql := format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%s)',
                    p_index, p_table, v_columns);
  ELSE
    v_sql := format('CREATE INDEX IF NOT EXISTS %I ON %I (%s)',
                    p_index, p_table, v_columns);
  END IF;
  
  -- Execute the statement
  EXECUTE v_sql;
END;
$$;

-- Function to get all indexes for a table
CREATE OR REPLACE FUNCTION get_table_indexes(p_table text)
RETURNS TABLE (
  table_name text,
  index_name text,
  column_names text[],
  is_unique boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::text AS table_name,
    t.indexname::text AS index_name,
    array_agg(a.attname::text)::text[] AS column_names,
    i.indisunique AS is_unique
  FROM
    pg_indexes t
    JOIN pg_class c ON c.relname = t.indexname
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE
    t.tablename = p_table
  GROUP BY
    t.tablename, t.indexname, i.indisunique;
END;
$$;

-- Function to analyze a table
CREATE OR REPLACE FUNCTION analyze_table(p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ANALYZE %I', p_table);
END;
$$;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats(p_table text)
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_size text,
  index_size text,
  table_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_table::text AS table_name,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = p_table) AS row_count,
    pg_size_pretty(pg_total_relation_size(p_table::text)) AS total_size,
    pg_size_pretty(pg_indexes_size(p_table::text)) AS index_size,
    pg_size_pretty(pg_relation_size(p_table::text)) AS table_size;
END;
$$;
