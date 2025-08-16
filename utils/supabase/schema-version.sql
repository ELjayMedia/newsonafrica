-- Schema Version Tracking System
-- This script sets up the schema_versions table and related functions

-- Create schema_versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  script_name TEXT,
  checksum TEXT,
  execution_time INTEGER, -- in milliseconds
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT
);

-- Create unique index on version
CREATE UNIQUE INDEX IF NOT EXISTS schema_versions_version_idx ON public.schema_versions(version);

-- Create function to get current schema version
CREATE OR REPLACE FUNCTION get_current_schema_version()
RETURNS VARCHAR AS $$
DECLARE
  current_version VARCHAR(50);
BEGIN
  SELECT version INTO current_version FROM public.schema_versions
  ORDER BY id DESC LIMIT 1;
  
  RETURN COALESCE(current_version, '0.0.0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a version has been applied
CREATE OR REPLACE FUNCTION is_version_applied(version_to_check VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  version_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.schema_versions
    WHERE version = version_to_check
  ) INTO version_exists;
  
  RETURN version_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to register a new schema version
CREATE OR REPLACE FUNCTION register_schema_version(
  p_version VARCHAR,
  p_description TEXT,
  p_applied_by UUID,
  p_script_name TEXT DEFAULT NULL,
  p_checksum TEXT DEFAULT NULL,
  p_execution_time INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.schema_versions (
    version,
    description,
    applied_by,
    script_name,
    checksum,
    execution_time,
    status,
    error_message
  ) VALUES (
    p_version,
    p_description,
    p_applied_by,
    p_script_name,
    p_checksum,
    p_execution_time,
    p_status,
    p_error_message
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- Version already exists, update it if it failed
    IF p_status = 'success' THEN
      RETURN FALSE;
    ELSE
      UPDATE public.schema_versions
      SET 
        description = p_description,
        applied_at = NOW(),
        applied_by = p_applied_by,
        script_name = p_script_name,
        checksum = p_checksum,
        execution_time = p_execution_time,
        status = p_status,
        error_message = p_error_message
      WHERE version = p_version;
      
      RETURN TRUE;
    END IF;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to compare semantic versions
CREATE OR REPLACE FUNCTION compare_versions(v1 VARCHAR, v2 VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  v1_parts INTEGER[];
  v2_parts INTEGER[];
  i INTEGER;
BEGIN
  -- Split versions into arrays of integers
  v1_parts := ARRAY(
    SELECT NULLIF(REGEXP_REPLACE(part, '[^0-9]', '', 'g'), '')::INTEGER
    FROM UNNEST(STRING_TO_ARRAY(v1, '.')) part
  );
  
  v2_parts := ARRAY(
    SELECT NULLIF(REGEXP_REPLACE(part, '[^0-9]', '', 'g'), '')::INTEGER
    FROM UNNEST(STRING_TO_ARRAY(v2, '.')) part
  );
  
  -- Ensure arrays have the same length
  WHILE array_length(v1_parts, 1) < array_length(v2_parts, 1) LOOP
    v1_parts := array_append(v1_parts, 0);
  END LOOP;
  
  WHILE array_length(v2_parts, 1) < array_length(v1_parts, 1) LOOP
    v2_parts := array_append(v2_parts, 0);
  END LOOP;
  
  -- Compare each part
  FOR i IN 1..array_length(v1_parts, 1) LOOP
    IF v1_parts[i] > v2_parts[i] THEN
      RETURN 1; -- v1 is greater
    ELSIF v1_parts[i] < v2_parts[i] THEN
      RETURN -1; -- v2 is greater
    END IF;
  END LOOP;
  
  RETURN 0; -- versions are equal
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get pending migrations
CREATE OR REPLACE FUNCTION get_pending_migrations(available_versions VARCHAR[])
RETURNS TABLE(version VARCHAR) AS $$
BEGIN
  RETURN QUERY
  WITH available AS (
    SELECT unnest(available_versions) AS version
  ),
  applied AS (
    SELECT version FROM public.schema_versions
    WHERE status = 'success'
  )
  SELECT a.version
  FROM available a
  LEFT JOIN applied ap ON a.version = ap.version
  WHERE ap.version IS NULL
  ORDER BY a.version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
