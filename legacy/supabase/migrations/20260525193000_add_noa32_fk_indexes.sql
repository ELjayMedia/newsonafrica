-- NOA-32: add covering indexes for foreign keys flagged by Supabase performance advisors.
-- This migration intentionally adds only the missing FK indexes.

create index if not exists idx_app_write_events_user_id
  on public.app_write_events (user_id);

create index if not exists idx_bookmarks_collection_id
  on public.bookmarks (collection_id);

create index if not exists idx_comment_reactions_user_id
  on public.comment_reactions (user_id);

create index if not exists idx_comment_reports_reporter_id
  on public.comment_reports (reporter_id);

create index if not exists idx_comments_reported_by
  on public.comments (reported_by);

create index if not exists idx_comments_reviewed_by
  on public.comments (reviewed_by);
