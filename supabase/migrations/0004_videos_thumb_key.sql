-- 0004_videos_thumb_key.sql
-- Stores the Cloudinary public_id of an uploaded thumbnail so the asset can
-- be destroyed server-side when the video is deleted or the thumb replaced.
alter table public.videos add column if not exists thumb_key text;
