-- 0006_videos_empty_strings.sql
-- Normalize legacy rows: empty strings in nullable video columns become NULL
-- so components can rely on `null` checks (and never render src="").
-- video_url is NOT NULL so it is intentionally left untouched.

update public.videos set thumbnail_url = null where thumbnail_url = '';
update public.videos set storage_key   = null where storage_key   = '';
update public.videos set thumb_key     = null where thumb_key     = '';
