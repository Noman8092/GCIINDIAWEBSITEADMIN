-- GCI India: run this whole file once in Supabase → SQL Editor. Safe to re-run.
create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists public.courses (
  id int primary key,
  title text not null,
  price int not null default 0 check (price >= 0),
  thumbnail_url text
);
insert into public.courses (id, title, price) values
 (1,'CCC Computer Course (NIELIT Pattern)',999),
 (2,'Free Computer Fundamentals & Typing Mastery',0),
 (3,'MS Excel & Advanced MIS Reporting',699),
 (4,'Complete E-commerce Seller (Amazon, Flipkart, Meesho)',1499),
 (5,'Full Stack Web Development (HTML, CSS, JS)',2199),
 (6,'Free Digital Marketing Starter Crash Course',0),
 (7,'O Level IT Tools & Network Basics (M1-R5)',1499),
 (8,'Google & Meta Ads Performance Marketing',1299)
on conflict (id) do update set title=excluded.title, price=excluded.price;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  mobile text check (mobile is null or mobile ~ '^[0-9]{10,15}$'),
  state text check (char_length(state) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id int not null references public.courses(id) on delete cascade,
  source text not null default 'free',
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  course_id int not null references public.courses(id) on delete cascade,
  lesson_no int not null default 1 check (lesson_no > 0),
  title text not null check (char_length(title) <= 200),
  video_url text,
  duration text,
  created_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons (course_id, lesson_no);

create table if not exists public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id int not null references public.courses(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create sequence if not exists public.certificate_seq start 1001;
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  roll_no text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id int not null references public.courses(id),
  student_name text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------- Auto-create profile on signup (email or Google) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, mobile) values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 100),
    case when new.raw_user_meta_data->>'mobile' ~ '^[0-9]{10,15}$' then new.raw_user_meta_data->>'mobile' end
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.courses enable row level security;
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;

drop policy if exists "courses readable" on public.courses;
create policy "courses readable" on public.courses for select to anon, authenticated using (true);

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own enrollments read" on public.enrollments;
create policy "own enrollments read" on public.enrollments for select to authenticated using (user_id = auth.uid());

alter table public.lessons enable row level security;
drop policy if exists "enrolled read lessons" on public.lessons;
create policy "enrolled read lessons" on public.lessons for select to authenticated
  using (exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = lessons.course_id));

alter table public.lesson_progress enable row level security;
drop policy if exists "own progress read" on public.lesson_progress;
create policy "own progress read" on public.lesson_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "own progress insert" on public.lesson_progress;
create policy "own progress insert" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = lesson_progress.course_id)
    and exists (select 1 from public.lessons l where l.id = lesson_progress.lesson_id and l.course_id = lesson_progress.course_id));
drop policy if exists "own progress delete" on public.lesson_progress;
create policy "own progress delete" on public.lesson_progress for delete to authenticated using (user_id = auth.uid());

revoke all on public.lessons, public.lesson_progress from anon;
revoke insert, update, delete on public.lessons from authenticated;
revoke update on public.lesson_progress from authenticated;
grant select on public.lessons to authenticated;

drop policy if exists "own certificates read" on public.certificates;
create policy "own certificates read" on public.certificates for select to authenticated using (user_id = auth.uid());

-- ---------- Table privileges (least privilege) ----------
revoke all on public.courses, public.profiles, public.enrollments, public.lesson_progress, public.certificates from anon;
revoke insert, update, delete on public.courses, public.enrollments, public.certificates from authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, mobile, state) on public.profiles to authenticated;
grant select on public.courses to anon, authenticated;

-- ---------- RPC functions ----------
create or replace function public.enroll_free(p_course int) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pr int;
begin
  if uid is null then raise exception 'GCI: Please log in.'; end if;
  select price into pr from courses where id = p_course;
  if pr is null then raise exception 'GCI: Course not found.'; end if;
  if pr > 0 then raise exception 'GCI: This is a paid course.'; end if;
  insert into enrollments (user_id, course_id, source) values (uid, p_course, 'free') on conflict do nothing;
end $$;

create or replace function public.issue_certificate(p_course int) returns public.certificates
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); need int; done int; cert public.certificates; nm text;
begin
  if uid is null then raise exception 'GCI: Please log in.'; end if;
  if not exists (select 1 from courses where id = p_course) then raise exception 'GCI: Course not found.'; end if;
  if not exists (select 1 from enrollments where user_id = uid and course_id = p_course) then
    raise exception 'GCI: You are not enrolled in this course.'; end if;
  select * into cert from certificates where user_id = uid and course_id = p_course;
  if found then return cert; end if;
  select count(*) into need from lessons where course_id = p_course;
  if need = 0 then raise exception 'GCI: Lessons for this course are not published yet.'; end if;
  select count(*) into done from lesson_progress lp join lessons l on l.id = lp.lesson_id
    where lp.user_id = uid and l.course_id = p_course;
  if done < need then raise exception 'GCI: Complete all lessons first.'; end if;
  nm := coalesce((select nullif(full_name,'') from profiles where id = uid), 'Student');
  insert into certificates (roll_no, user_id, course_id, student_name)
  values ('GCI-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text, 5, '0'), uid, p_course, nm)
  returning * into cert;
  return cert;
end $$;

create or replace function public.verify_certificate(p_roll text)
returns table (roll_no text, student_name text, course_title text, issued_at timestamptz)
language sql security definer set search_path = public stable as $$
  select c.roll_no, c.student_name, co.title, c.issued_at
  from certificates c join courses co on co.id = c.course_id
  where upper(c.roll_no) = upper(trim(p_roll)) limit 1
$$;

-- Admin only (run from SQL editor): give a student access to a paid course
create or replace function public.grant_enrollment(p_email text, p_course int, p_source text default 'manual')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return 'No user with that email'; end if;
  insert into enrollments (user_id, course_id, source) values (uid, p_course, p_source) on conflict do nothing;
  return 'Enrolled';
end $$;

revoke all on function public.enroll_free(int), public.issue_certificate(int), public.verify_certificate(text), public.grant_enrollment(text,int,text) from public, anon, authenticated;
grant execute on function public.enroll_free(int), public.issue_certificate(int) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
-- grant_enrollment stays unavailable to the API on purpose.

create or replace function public.course_outline(p_course int)
returns table (lesson_no int, title text, duration text)
language sql security definer set search_path = public stable as $$
  select l.lesson_no, l.title, l.duration from lessons l where l.course_id = p_course order by l.lesson_no, l.id
$$;
revoke all on function public.course_outline(int) from public, anon, authenticated;
grant execute on function public.course_outline(int) to anon, authenticated;
