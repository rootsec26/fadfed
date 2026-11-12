-- 0003_videos.sql
-- Public videos table + Supabase Storage bucket for direct browser uploads.
-- Column names match src/db/schema.ts exactly.
-- Metadata only: video files live in Storage, never in Postgres.

-- Enum (matches drizzle pgEnum "video_source").
drop type if exists public."video_source" cascade;
create type public."video_source" as enum ('youtube', 'vimeo', 'upload');

drop table if exists public.videos cascade;
create table public.videos (
  id               serial primary key,
  title_ar         text not null,
  title_en         text,
  description_ar   text,
  description_en   text,
  source_type      public."video_source" not null,
  video_url        text not null,
  storage_key      text,
  thumbnail_url    text,
  category         text,
  duration_seconds integer,
  is_published     boolean not null default false,
  is_featured      boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamp not null default now(),
  updated_at       timestamp not null default now()
);

create index if not exists videos_published_sort_idx on public.videos (is_published, sort_order);
create index if not exists videos_created_idx on public.videos (created_at);

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- ── Storage bucket ─────────────────────────────────────────────
-- Public bucket: objects are served by unguessable paths
-- (/storage/v1/object/public/videos/<key>). 50MB cap + video/image
-- MIME allow-list keep the free tier safe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  52428800, -- 50 MB
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Signed upload URLs are minted server-side with the service role, so no
-- storage.objects policies are needed for the browser (it never holds a
-- Supabase session). Reads of the public bucket need no policy either.
