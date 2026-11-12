-- 0010_rls_videos_live.sql
-- Enable Row Level Security on the two tables added after 0002_rls.sql.
-- The app connects via direct Postgres / service role (bypasses RLS), so
-- these policies only constrain the anon/authenticated Supabase keys.

alter table public.videos enable row level security;
alter table public.live_sessions enable row level security;

-- videos: clients may read PUBLISHED rows only. Unpublished drafts, storage
-- keys and internal flags stay server-side.
drop policy if exists "videos_public_read_published" on public.videos;
create policy "videos_public_read_published" on public.videos
  for select to anon, authenticated
  using (is_published = true);

-- live_sessions: deliberately NO client policies. Session rows reference
-- patient user ids, room names and manual links — all access goes through
-- the app server, which bypasses RLS. Enabled + zero policies = deny all.
