DROP TRIGGER IF EXISTS set_transfers_updated_at ON public.transfers;
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS create_user_settings_trigger ON auth.users;
DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_comment_reaction_count_trigger ON public.comment_reactions;

DROP FUNCTION IF EXISTS public.create_user_settings();
DROP FUNCTION IF EXISTS public.update_comment_reaction_count();

DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.schema_versions CASCADE;
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
