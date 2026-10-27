-- 006: run ONCE in Supabase -> SQL Editor (after 004). Adds Live classes and Notes & PDFs. Safe to re-run.

-- IMPORTANT FIX: visitors (not logged in) must be able to evaluate is_admin() inside the public courses policy
grant execute on function public.is_admin() to anon, authenticated;

-- admins can read student profiles (name, mobile) to contact registered students
drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles" on public.profiles for select to authenticated using (public.is_admin());

-- ===================== NOTES & PDFs =====================
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  course_id int references public.courses(id) on delete cascade,
  title text not null check (char_length(title) <= 200),
  description text not null default '',
  file_path text not null,
  file_name text not null default '',
  file_size int not null default 0,
  is_free boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "notes read" on public.notes;
create policy "notes read" on public.notes for select to anon, authenticated using (
  is_free or public.is_admin()
  or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = notes.course_id));
drop policy if exists "admin manage notes" on public.notes;
create policy "admin manage notes" on public.notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.notes to anon, authenticated;
grant insert, update, delete on public.notes to authenticated;

-- free-notes: public bucket (anyone can read the link). course-notes: private (only enrolled students and admins)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('free-notes', 'free-notes', true, 20971520, array['application/pdf']),
  ('course-notes', 'course-notes', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];

drop policy if exists "admin write notes files" on storage.objects;
create policy "admin write notes files" on storage.objects for insert to authenticated
  with check (bucket_id in ('free-notes', 'course-notes') and public.is_admin());
drop policy if exists "admin update notes files" on storage.objects;
create policy "admin update notes files" on storage.objects for update to authenticated
  using (bucket_id in ('free-notes', 'course-notes') and public.is_admin());
drop policy if exists "admin delete notes files" on storage.objects;
create policy "admin delete notes files" on storage.objects for delete to authenticated
  using (bucket_id in ('free-notes', 'course-notes') and public.is_admin());
drop policy if exists "course notes read" on storage.objects;
create policy "course notes read" on storage.objects for select to authenticated using (
  bucket_id = 'course-notes' and (public.is_admin() or exists (
    select 1 from public.notes n join public.enrollments e on e.course_id = n.course_id
    where n.file_path = storage.objects.name and n.is_free = false and e.user_id = auth.uid())));

-- ===================== LIVE CLASSES =====================
create table if not exists public.live_classes (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) <= 200),
  description text not null default '',
  course_id int references public.courses(id) on delete set null,
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 5 and 600),
  platform text not null default 'Google Meet',
  host text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists live_classes_start_idx on public.live_classes (starts_at);
-- the secret meeting link lives in a separate table that only admins can read
create table if not exists public.live_links (
  class_id bigint primary key references public.live_classes(id) on delete cascade,
  join_url text not null default '',
  recording_url text not null default ''
);
create table if not exists public.live_registrations (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id bigint not null references public.live_classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);
alter table public.live_classes enable row level security;
alter table public.live_links enable row level security;
alter table public.live_registrations enable row level security;

drop policy if exists "live classes read" on public.live_classes;
create policy "live classes read" on public.live_classes for select to anon, authenticated using (published or public.is_admin());
drop policy if exists "admin manage live classes" on public.live_classes;
create policy "admin manage live classes" on public.live_classes for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage live links" on public.live_links;
create policy "admin manage live links" on public.live_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own registrations read" on public.live_registrations;
create policy "own registrations read" on public.live_registrations for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "register for live class" on public.live_registrations;
create policy "register for live class" on public.live_registrations for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.live_classes c where c.id = class_id and c.published));
drop policy if exists "cancel registration" on public.live_registrations;
create policy "cancel registration" on public.live_registrations for delete to authenticated using (user_id = auth.uid() or public.is_admin());

revoke all on public.live_classes, public.live_links, public.live_registrations from anon, authenticated;
grant select on public.live_classes to anon, authenticated;
grant insert, update, delete on public.live_classes to authenticated;
grant select, insert, update, delete on public.live_links to authenticated;
grant select, insert, delete on public.live_registrations to authenticated;

-- gives the join link only to registered students, from 15 minutes before the start; recording link after the class
create or replace function public.live_access(p_class bigint)
returns table (o_status text, o_join text, o_rec text)
language plpgsql security definer stable set search_path = public as $$
declare c record; l record; uid uuid := auth.uid();
begin
  if uid is null then return query select 'login'::text, ''::text, ''::text; return; end if;
  select * into c from live_classes where id = p_class and (published or public.is_admin());
  if not found then return query select 'missing'::text, ''::text, ''::text; return; end if;
  if not public.is_admin() and not exists (select 1 from live_registrations r where r.class_id = p_class and r.user_id = uid) then
    return query select 'register'::text, ''::text, ''::text; return; end if;
  select * into l from live_links where class_id = p_class;
  if now() < c.starts_at - interval '15 minutes' then
    return query select 'early'::text, ''::text, ''::text;
  elsif now() <= c.starts_at + make_interval(mins => c.duration_min + 120) then
    return query select 'live'::text, coalesce(l.join_url, ''), ''::text;
  else
    return query select 'ended'::text, ''::text, coalesce(l.recording_url, '');
  end if;
end $$;
revoke all on function public.live_access(bigint) from public, anon;
grant execute on function public.live_access(bigint) to authenticated;
