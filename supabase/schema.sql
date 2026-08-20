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
  -- Teacher-only metadata (null for admin/parent rows). "primary" teachers are
  -- assigned one whole classroom (teaching_class); "secondary" teachers are
  -- assigned a subject taught across one or more classes (teaching_classes),
  -- since a subject teacher (e.g. Chemistry) often teaches several classes
  -- (e.g. SS1 and SS2) rather than owning a single fixed classroom.
  teaching_level text check (teaching_level in ('primary', 'secondary')),
  teaching_class text,
  teaching_subject text,
  teaching_classes text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Backfill for databases created before these columns existed.
alter table public.profiles add column if not exists teaching_level text;
alter table public.profiles add column if not exists teaching_class text;
alter table public.profiles add column if not exists teaching_subject text;
alter table public.profiles add column if not exists teaching_classes text[] not null default '{}';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_teaching_level_check'
  ) then
    alter table public.profiles
      add constraint profiles_teaching_level_check
      check (teaching_level in ('primary', 'secondary'));
  end if;
end $$;

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

-- Needed for admin-created teacher accounts: setting role/teaching_level/
-- teaching_class/teaching_subject on the new teacher's profile row.
drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write"
  on public.profiles for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

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

-- Parents otherwise have no write access at all (admin_write above is
-- admin-only) — this narrow addition lets a parent update ONLY avatar_path
-- on their own linked child, for the photo-upload feature. The column GRANT
-- is what actually blocks them from touching any other column; the policy
-- alone only controls which rows, not which columns.
grant update (avatar_path) on public.students to authenticated;

drop policy if exists "students_parent_avatar_write" on public.students;
create policy "students_parent_avatar_write"
  on public.students for update
  using (parent_user_id = auth.uid())
  with check (parent_user_id = auth.uid());

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
  -- Every session runs First, Second, then Third Term (see TERM_OPTIONS in
  -- src/lib/grading.ts). `session` is a free-text academic year, e.g. "2025/2026".
  term text not null default 'First Term' check (term in ('First Term', 'Second Term', 'Third Term')),
  session text not null default '2025/2026',
  created_at timestamptz not null default now(),
  unique (student_id, subject, term, session)
);

alter table public.grades enable row level security;

-- Migration for databases created before term/session were split out to
-- support multiple terms per subject per student.
alter table public.grades add column if not exists session text not null default '2025/2026';
update public.grades set term = case term
  when 'Term 1' then 'First Term'
  when 'Term 2' then 'Second Term'
  when 'Term 3' then 'Third Term'
  when 'Midterm' then 'First Term'
  when 'Final' then 'Third Term'
  else term
end
where term not in ('First Term', 'Second Term', 'Third Term');
alter table public.grades drop constraint if exists grades_term_check;
alter table public.grades add constraint grades_term_check check (term in ('First Term', 'Second Term', 'Third Term'));
alter table public.grades alter column term set default 'First Term';
alter table public.grades drop constraint if exists grades_student_id_subject_key;
alter table public.grades drop constraint if exists grades_student_id_subject_term_session_key;
alter table public.grades add constraint grades_student_id_subject_term_session_key unique (student_id, subject, term, session);

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
  avatar_path text,
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

-- Narrow addition, same pattern as students.avatar_path: the applicant may
-- update ONLY avatar_path on their own submission (the column GRANT is what
-- actually blocks every other column, not the policy alone).
grant update (avatar_path) on public.admission_applications to authenticated;

drop policy if exists "applications_owner_avatar_write" on public.admission_applications;
create policy "applications_owner_avatar_write"
  on public.admission_applications for update
  using (applicant_user_id = auth.uid())
  with check (applicant_user_id = auth.uid());

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
  v_new_avatar_path text;
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

  -- Carry the applicant's uploaded photo over by moving the storage object
  -- itself (same bucket, new path) rather than re-uploading a second copy.
  if v_app.avatar_path is not null then
    v_new_avatar_path := v_student_id::text || '/avatar' || substring(v_app.avatar_path from '\.[^.]*$');
    update storage.objects
    set name = v_new_avatar_path
    where bucket_id = 'student-avatars' and name = v_app.avatar_path;

    update public.students set avatar_path = v_new_avatar_path where id = v_student_id;
  end if;

  update public.admission_applications
  set status = 'accepted', reviewed_by = auth.uid(), reviewed_at = now(), created_student_id = v_student_id
  where id = p_application_id;

  return v_student_id;
end;
$$;

grant execute on function public.approve_application(uuid, text, text, text, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Student avatar uploads — a private Storage bucket, not a public one.
-- These are photos of children; access is scoped exactly like the students
-- table itself (admin, the linked parent, or an assigned teacher), via
-- Storage's own RLS on storage.objects. Files are stored at
-- "<student_id>/<filename>", so the first path segment is used to check
-- who's allowed to read/write it.
-- ---------------------------------------------------------------------------
alter table public.students add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('student-avatars', 'student-avatars', false)
on conflict (id) do nothing;

-- Applications store their (pre-enrollment) photo at
-- "applications/<application_id>/...", distinguishable from a student's
-- "<student_id>/..." by that literal first segment.
drop policy if exists "avatar_select_scoped" on storage.objects;
create policy "avatar_select_scoped"
  on storage.objects for select
  using (
    bucket_id = 'student-avatars' and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.students s
        where s.id::text = (storage.foldername(storage.objects.name))[1]
          and s.parent_user_id = auth.uid()
      )
      or exists (
        select 1 from public.teacher_students ts
        where ts.student_id::text = (storage.foldername(storage.objects.name))[1]
          and ts.teacher_user_id = auth.uid()
      )
      or exists (
        select 1 from public.admission_applications a
        where (storage.foldername(storage.objects.name))[1] = 'applications'
          and a.id::text = (storage.foldername(storage.objects.name))[2]
          and a.applicant_user_id = auth.uid()
      )
    )
  );

drop policy if exists "avatar_write_own_or_admin" on storage.objects;
create policy "avatar_write_own_or_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'student-avatars' and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.students s
        where s.id::text = (storage.foldername(storage.objects.name))[1]
          and s.parent_user_id = auth.uid()
      )
      or exists (
        select 1 from public.admission_applications a
        where (storage.foldername(storage.objects.name))[1] = 'applications'
          and a.id::text = (storage.foldername(storage.objects.name))[2]
          and a.applicant_user_id = auth.uid()
      )
    )
  );

drop policy if exists "avatar_update_own_or_admin" on storage.objects;
create policy "avatar_update_own_or_admin"
  on storage.objects for update
  using (
    bucket_id = 'student-avatars' and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.students s
        where s.id::text = (storage.foldername(storage.objects.name))[1]
          and s.parent_user_id = auth.uid()
      )
      or exists (
        select 1 from public.admission_applications a
        where (storage.foldername(storage.objects.name))[1] = 'applications'
          and a.id::text = (storage.foldername(storage.objects.name))[2]
          and a.applicant_user_id = auth.uid()
      )
    )
  );

drop policy if exists "avatar_delete_own_or_admin" on storage.objects;
create policy "avatar_delete_own_or_admin"
  on storage.objects for delete
  using (
    bucket_id = 'student-avatars' and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.students s
        where s.id::text = (storage.foldername(storage.objects.name))[1]
          and s.parent_user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Parent <-> teacher messaging. A conversation is one (student, teacher)
-- pair — e.g. a parent messaging their child's Chemistry teacher is a
-- separate thread from messaging that same child's class teacher. Admin can
-- read every thread (school-office oversight); only the parent and the
-- teacher in a thread can post to it.
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);

alter table public.conversations enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'teacher')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- SECURITY DEFINER so it can check ownership across students/conversations
-- without those tables' own RLS recursing back into this policy.
create or replace function public.can_access_conversation(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversations c
    join public.students s on s.id = c.student_id
    where c.id = conv_id
      and (
        public.current_role() = 'admin'
        or s.parent_user_id = auth.uid()
        or c.teacher_id = auth.uid()
      )
  );
$$;

-- A conversation may only be opened between a student's own parent (or an
-- admin, or the teacher themselves) and a teacher actually assigned to that
-- student — so a parent can't message staff who don't teach their child.
create or replace function public.can_create_conversation(p_student_id uuid, p_teacher_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.teacher_students ts
    where ts.student_id = p_student_id and ts.teacher_user_id = p_teacher_id
  )
  and (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and s.parent_user_id = auth.uid()
    )
    or p_teacher_id = auth.uid()
  );
$$;

-- Lets a parent discover which teachers they're allowed to message for a
-- given child, without granting them broad read access to `profiles` or
-- `teacher_students` in general.
create or replace function public.list_teachers_for_student(p_student_id uuid)
returns table (teacher_id uuid, full_name text, teaching_subject text, teaching_class text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.teaching_subject, p.teaching_class
  from public.teacher_students ts
  join public.profiles p on p.id = ts.teacher_user_id
  where ts.student_id = p_student_id
    and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.students s
        where s.id = p_student_id and s.parent_user_id = auth.uid()
      )
      or exists (
        select 1 from public.teacher_students ts2
        where ts2.student_id = p_student_id and ts2.teacher_user_id = auth.uid()
      )
    );
$$;

grant execute on function public.list_teachers_for_student(uuid) to authenticated;

drop policy if exists "conversations_select_scoped" on public.conversations;
create policy "conversations_select_scoped"
  on public.conversations for select
  using (public.can_access_conversation(id));

drop policy if exists "conversations_insert_scoped" on public.conversations;
create policy "conversations_insert_scoped"
  on public.conversations for insert
  with check (public.can_create_conversation(student_id, teacher_id));

drop policy if exists "messages_select_scoped" on public.messages;
create policy "messages_select_scoped"
  on public.messages for select
  using (public.can_access_conversation(conversation_id));

drop policy if exists "messages_insert_scoped" on public.messages;
create policy "messages_insert_scoped"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = public.current_role()
    and public.can_access_conversation(conversation_id)
  );

-- Live delivery for the chat UI (admin's oversight view stays refresh-based).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
