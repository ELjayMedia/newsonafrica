-- Align comment country data with edition-aware policies

DO $$
DECLARE
  country_expr text := '';
  separator text := '';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'country'
  ) THEN
    country_expr := country_expr || separator || 'NULLIF(p.country, '''')';
    separator := ', ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'country_pref'
  ) THEN
    country_expr := country_expr || separator || 'NULLIF(p.country_pref, '''')';
    separator := ', ';
  END IF;

  IF country_expr = '' THEN
    country_expr := 'NULLIF(u.raw_app_meta_data->>''country'', '''')';
  ELSE
    country_expr := country_expr || separator || 'NULLIF(u.raw_app_meta_data->>''country'', '''')';
  END IF;

  country_expr := format('COALESCE(%s, ''african-edition'')', country_expr);

  EXECUTE format(
    'UPDATE public.comments AS c
     SET country = %1$s
     FROM auth.users AS u
     LEFT JOIN public.profiles AS p ON p.id = u.id
     WHERE c.user_id = u.id
       AND COALESCE(c.country, '''') IS DISTINCT FROM %1$s;',
    country_expr
  );
END $$;

-- Default any remaining NULL or blank countries to the primary edition
UPDATE public.comments
SET country = 'african-edition'
WHERE country IS NULL OR btrim(country) = '';
