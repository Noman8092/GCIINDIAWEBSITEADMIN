-- Run ONCE: lets you set a thumbnail image for each course from the Supabase Table Editor.
alter table public.courses add column if not exists thumbnail_url text;
