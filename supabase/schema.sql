-- Lindner International School — Supabase schema, RLS, and triggers.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, holds the app role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('admin', 'teacher', 'parent')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so RLS on profiles itself doesn't recurse when other
-- policies call this to check the caller's role.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_role() = 'admin');

-- New Supabase Auth users get a profile row automatically (role defaults to
-- 'parent'; an admin corrects it afterwards for staff — see the runbook in
-- README). A newly signed-up parent is also auto-linked to any student row
-- whose parent_email matches their signup email, so self-service sign-up
-- doesn't need an admin to manually run link_parent_by_email afterward —
-- the match is safe because it requires owning that inbox (Supabase's email
-- confirmation step), not just knowing a publicly-known fact like a surname.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'parent'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  update public.students
  set parent_user_id = new.id
  where lower(parent_email) = lower(new.email)
    and parent_user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- students (table only here — RLS policies come after teacher_students
-- exists, since one of them references it).
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  name text not null,
  grade_level text not null default 'Unassigned',
  classroom text not null default 'Unassigned',
  roll_number int not null default 1,
  date_of_birth date,
  enrollment_date date,
  house text not null default 'Phoenix' check (house in ('Phoenix', 'Griffin', 'Pegasus', 'Dragon')),
  parent_name text not null default 'Unassigned',
  parent_email text not null default '',
  avatar_url text not null default 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
  clubs text[] not null default '{}',
  teacher_remarks text not null default '',
  general_status text not null default 'Good' check (general_status in ('Excellent', 'Good', 'Needs Improvement', 'Critical')),
  attendance_total_days int not null default 0,
  attendance_present int not null default 0,
  attendance_absent int not null default 0,
  attendance_unexcused int not null default 0,
  parent_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

-- ---------------------------------------------------------------------------
-- teacher_students — join table replacing the old assignedStudentIds array.
-- Created right after `students` (which it references) and before the
-- students/grades RLS policies (which reference it back).
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_students (
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (teacher_user_id, student_id)
);

alter table public.teacher_students enable row level security;

drop policy if exists "teacher_students_select" on public.teacher_students;
create policy "teacher_students_select"
  on public.teacher_students for select
  using (public.current_role() = 'admin' or teacher_user_id = auth.uid());

drop policy if exists "teacher_students_admin_write" on public.teacher_students;
create policy "teacher_students_admin_write"
  on public.teacher_students for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Now that teacher_students exists, the students policies that reference it can be created.
drop policy if exists "students_select_scoped" on public.students;
create policy "students_select_scoped"
  on public.students for select
  using (
    public.current_role() = 'admin'
    or parent_user_id = auth.uid()
    or exists (
      select 1 from public.teacher_students ts
      where ts.student_id = students.id and ts.teacher_user_id = auth.uid()
    )
  );

drop policy if exists "students_admin_write" on public.students;
create policy "students_admin_write"
  on public.students for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- grades — one row per grade; `grade` letter is always derived from `score`,
-- mirroring src/lib/grading.ts's letterForScore so it can never drift.
-- ---------------------------------------------------------------------------
create or replace function public.compute_grade_letter(score numeric)
returns text
language sql
immutable
as $$
  select case
    when score >= 95 then 'A+'
    when score >= 90 then 'A'
    when score >= 80 then 'B'
    when score >= 70 then 'C'
    when score >= 60 then 'D'
    else 'F'
  end;
$$;

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject text not null,
  score numeric not null check (score >= 0 and score <= 100),
  grade text generated always as (public.compute_grade_letter(score)) stored,
  teacher text not null default 'Unassigned',
  term text not null default 'Term 2' check (term in ('Term 1', 'Term 2', 'Term 3', 'Midterm', 'Final')),
  created_at timestamptz not null default now(),
  unique (student_id, subject)
);

alter table public.grades enable row level security;

drop policy if exists "grades_select_scoped" on public.grades;
create policy "grades_select_scoped"
  on public.grades for select
  using (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.students s
      where s.id = grades.student_id and s.parent_user_id = auth.uid()
    )
    or exists (
      select 1 from public.teacher_students ts
      where ts.student_id = grades.student_id and ts.teacher_user_id = auth.uid()
    )
  );

drop policy if exists "grades_admin_write" on public.grades;
create policy "grades_admin_write"
  on public.grades for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- events — public read (the campus calendar is public info today too),
-- admin-only write.
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text not null default 'All day',
  location text not null default 'To be confirmed',
  category text not null default 'Academic' check (category in ('Academic', 'Sports', 'Arts', 'Community', 'Holiday', 'Exams')),
  description text not null default '',
  organizer text not null default 'General Office',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public"
  on public.events for select
  to anon, authenticated
  using (true);

drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write"
  on public.events for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- link_parent_by_email — lets an admin link a student row to a parent's
-- Supabase Auth account by email, once that account exists (created via the
-- Supabase Dashboard — see README). Clients can't query auth.users directly,
-- so this SECURITY DEFINER function is the one safe, narrow way to do the
-- lookup without exposing the service-role key to the browser.
-- ---------------------------------------------------------------------------
create or replace function public.link_parent_by_email(p_student_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Only administrators may link parent accounts.';
  end if;

  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'No account found for that email yet. Create the parent''s login in Supabase Authentication first, then link again.';
  end if;

  update public.students set parent_user_id = v_user_id where id = p_student_id;
end;
$$;

grant execute on function public.link_parent_by_email(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admission_applications — prospective-family submissions, deliberately kept
-- separate from `students`. A row here is not an enrolled student and must
-- not be treated as one (no grades/teacher access should ever attach to it)
-- until an admin reviews it and runs approve_application(), which is the only
-- path that creates the real `students` row.
-- ---------------------------------------------------------------------------
create table if not exists public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  child_name text not null,
  date_of_birth date,
  grade_applying_for text not null,
  parent_name text not null,
  parent_phone text not null default '',
  notes text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'accepted', 'rejected')),
  created_student_id uuid references public.students(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

alter table public.admission_applications enable row level security;

drop policy if exists "applications_select_own_or_admin" on public.admission_applications;
create policy "applications_select_own_or_admin"
  on public.admission_applications for select
  using (applicant_user_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "applications_insert_own" on public.admission_applications;
create policy "applications_insert_own"
  on public.admission_applications for insert
  to authenticated
  with check (applicant_user_id = auth.uid());

drop policy if exists "applications_admin_write" on public.admission_applications;
create policy "applications_admin_write"
  on public.admission_applications for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Accepting an application creates the real student record (admin confirms
-- the official grade/classroom/house/roll number — not whatever the
-- applicant requested) and links it straight to the applicant's own account,
-- so the parent's existing login becomes their real Parent Portal access
-- with no separate linking step needed.
create or replace function public.approve_application(
  p_application_id uuid,
  p_student_code text,
  p_grade_level text,
  p_classroom text,
  p_roll_number int,
  p_house text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.admission_applications%rowtype;
  v_parent_email text;
  v_student_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Only administrators may approve applications.';
  end if;

  select * into v_app from public.admission_applications where id = p_application_id;
  if v_app.id is null then
    raise exception 'Application not found.';
  end if;
  if v_app.status = 'accepted' then
    raise exception 'This application has already been accepted.';
  end if;

  select email into v_parent_email from auth.users where id = v_app.applicant_user_id;

  insert into public.students (
    student_code, name, grade_level, classroom, roll_number, date_of_birth,
    enrollment_date, house, parent_name, parent_email, parent_user_id
  ) values (
    p_student_code, v_app.child_name, p_grade_level, p_classroom, p_roll_number, v_app.date_of_birth,
    current_date, p_house, v_app.parent_name, coalesce(v_parent_email, ''), v_app.applicant_user_id
  )
  returning id into v_student_id;

  update public.admission_applications
  set status = 'accepted', reviewed_by = auth.uid(), reviewed_at = now(), created_student_id = v_student_id
  where id = p_application_id;

  return v_student_id;
end;
$$;

grant execute on function public.approve_application(uuid, text, text, text, int, text) to authenticated;
