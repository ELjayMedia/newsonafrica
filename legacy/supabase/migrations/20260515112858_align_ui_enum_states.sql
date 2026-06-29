-- Align live Supabase enum values with UI/code states.
-- The UI supports bookmark read_state = 'in_progress' and comment status = 'flagged'.
-- Add these values without changing existing rows.

alter type public.read_status add value if not exists 'in_progress' after 'unread';

alter type public.comment_status add value if not exists 'flagged' after 'active';