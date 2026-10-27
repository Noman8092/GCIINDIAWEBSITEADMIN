-- Run ONCE in Supabase → SQL Editor on your existing database.
-- Moves lessons into the database so every course can have any number of lessons.
-- (Only test progress data is reset; students, enrollments and certificates are kept.)
drop table if exists public.lesson_progress cascade;
alter table public.courses drop column if exists total_lessons;

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

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id int not null references public.courses(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

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
revoke all on function public.issue_certificate(int) from public, anon, authenticated;
grant execute on function public.issue_certificate(int) to authenticated;

create or replace function public.course_outline(p_course int)
returns table (lesson_no int, title text, duration text)
language sql security definer set search_path = public stable as $$
  select l.lesson_no, l.title, l.duration from lessons l where l.course_id = p_course order by l.lesson_no, l.id
$$;
revoke all on function public.course_outline(int) from public, anon, authenticated;
grant execute on function public.course_outline(int) to anon, authenticated;
