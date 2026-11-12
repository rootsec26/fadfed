-- 0005_video_link_sources.sql
-- Extend video_source enum so admins can link ANY site (TikTok, Instagram,
-- Facebook, direct .mp4/.webm/.mov files, or a plain external link card).
-- Existing rows keep working: enum values are only added, never removed.

alter type public."video_source" add value if not exists 'tiktok';
alter type public."video_source" add value if not exists 'instagram';
alter type public."video_source" add value if not exists 'facebook';
alter type public."video_source" add value if not exists 'direct';
alter type public."video_source" add value if not exists 'external';
