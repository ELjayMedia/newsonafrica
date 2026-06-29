REVOKE ALL ON FUNCTION public.column_exists FROM authenticated;
DROP FUNCTION IF EXISTS public.column_exists(text, text);
