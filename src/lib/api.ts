import type { AdmissionApplication, GradeRecord, SchoolEvent, StudentProfile, TeacherProfile } from '../types';
import { supabase } from './supabaseClient';

/**
 * Data-access layer: maps Supabase's snake_case rows to the app's existing
 * camelCase shapes (StudentProfile, TeacherProfile, SchoolEvent) so the rest
 * of the app — AdminPortal, ParentPortal, CalendarSection — barely changes.
 * Authorization is enforced by Postgres Row Level Security (see
 * supabase/schema.sql), not by anything in this file: a query here only ever
 * returns what the signed-in user is allowed to see.
 */

interface GradeRow {
  id: string;
  subject: string;
  score: number;
  grade: GradeRecord['grade'];
  teacher: string;
  term: GradeRecord['term'];
}

interface StudentRow {
  id: string;
  student_code: string;
  name: string;
  grade_level: string;
  classroom: string;
  roll_number: number;
  date_of_birth: string | null;
  enrollment_date: string | null;
  house: StudentProfile['house'];
  parent_name: string;
  parent_email: string;
  parent_user_id: string | null;
  avatar_url: string;
  avatar_path: string | null;
  clubs: string[];
  teacher_remarks: string;
  general_status: StudentProfile['generalStatus'];
  attendance_total_days: number;
  attendance_present: number;
  attendance_absent: number;
  attendance_unexcused: number;
  grades?: GradeRow[];
}

/** Private bucket — see supabase/schema.sql for the RLS scoping this relies on. */
const AVATAR_BUCKET = 'student-avatars';
const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function mapGrade(row: GradeRow): GradeRecord {
  return {
    id: row.id,
    subject: row.subject,
    score: row.score,
    grade: row.grade,
    teacher: row.teacher,
    term: row.term,
  };
}

function mapStudent(row: StudentRow): StudentProfile {
  const totalDays = row.attendance_total_days;
  return {
    id: row.id,
    name: row.name,
    studentId: row.student_code,
    gradeLevel: row.grade_level,
    classroom: row.classroom,
    rollNumber: row.roll_number,
    dateOfBirth: row.date_of_birth ?? '',
    enrollmentDate: row.enrollment_date ?? '',
    house: row.house,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    parentUserId: row.parent_user_id,
    avatarUrl: row.avatar_url,
    clubs: row.clubs ?? [],
    grades: (row.grades ?? []).map(mapGrade),
    attendance: {
      totalDays,
      present: row.attendance_present,
      absent: row.attendance_absent,
      unexcused: row.attendance_unexcused,
      percentage: totalDays > 0 ? Math.round((row.attendance_present / totalDays) * 1000) / 10 : 0,
    },
    teacherRemarks: row.teacher_remarks,
    generalStatus: row.general_status,
  };
}

export async function fetchStudents(): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*, grades(*)')
    .order('roll_number', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as StudentRow[];
  const students = rows.map(mapStudent);

  // The bucket is private, so a plain public URL never works — a signed URL
  // has to be minted per-request for whichever rows RLS actually let through.
  const withUpload = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.avatar_path);
  if (withUpload.length > 0) {
    const signed = await Promise.all(
      withUpload.map(({ row }) =>
        supabase.storage.from(AVATAR_BUCKET).createSignedUrl(row.avatar_path as string, AVATAR_SIGNED_URL_TTL_SECONDS),
      ),
    );
    signed.forEach((result, i) => {
      const url = result.data?.signedUrl;
      if (url) students[withUpload[i].idx].avatarUrl = url;
    });
  }

  return students;
}

function avatarFileExt(file: File): string {
  return (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

/** Shared by both upload entry points below — validates and uploads to a
 *  given path, leaving the caller to update whichever row owns that path. */
async function uploadAvatarFile(path: string, file: File): Promise<void> {
  const MAX_BYTES = 5 * 1024 * 1024;
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, etc.).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('That image is too large — please choose one under 5MB.');
  }
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
}

/** Uploads a new photo for an already-enrolled student, replacing any
 *  previous one, and returns a signed URL ready to display immediately. */
export async function uploadStudentAvatar(studentId: string, file: File): Promise<string> {
  const path = `${studentId}/avatar.${avatarFileExt(file)}`;
  await uploadAvatarFile(path, file);

  const { error: updateError } = await supabase
    .from('students')
    .update({ avatar_path: path })
    .eq('id', studentId);
  if (updateError) throw updateError;

  const { data: signedData, error: signError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (signError) throw signError;

  return signedData.signedUrl;
}

/**
 * Returns every teacher an admin can see, or just the caller's own row for a
 * teacher session (that's all Row Level Security lets them read) — either
 * way it's enough for resolveSessionUser's self-lookup plus AdminPortal's
 * read-only teacher context.
 */
export async function fetchTeachers(): Promise<TeacherProfile[]> {
  const [{ data: profiles, error: profileErr }, { data: links, error: linkErr }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, teaching_level, teaching_class, teaching_subject')
      .eq('role', 'teacher'),
    supabase.from('teacher_students').select('teacher_user_id, student_id'),
  ]);
  if (profileErr) throw profileErr;
  if (linkErr) throw linkErr;

  return (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    assignedStudentIds: (links ?? [])
      .filter((l) => l.teacher_user_id === p.id)
      .map((l) => l.student_id),
    teachingLevel: (p.teaching_level as TeacherProfile['teachingLevel']) ?? null,
    teachingClass: p.teaching_class ?? null,
    teachingSubject: p.teaching_subject ?? null,
  }));
}

export interface NewTeacherInput {
  email: string;
  password: string;
  fullName: string;
  level: 'primary' | 'secondary';
  /** Required when level === 'primary'. Every student in this classroom is
   *  auto-assigned. */
  classroom?: string;
  /** Required when level === 'secondary'. */
  subject?: string;
  /** Required when level === 'secondary' — there's no single classroom to
   *  derive the roster from, so admin picks students directly. */
  studentIds?: string[];
}

/**
 * Creates a teacher's real login in-app, reusing the same signUp() call
 * self-service parent sign-up uses. This is safe ONLY because Supabase's
 * "Enable email confirmations" setting is on: with it on, signUp() returns
 * no session for the new (unconfirmed) account, so the admin's own session
 * in this browser is left untouched. If that setting is ever turned off,
 * this call would instead return an active session for the new teacher and
 * silently replace the admin's session with it — hence the check below.
 */
export async function createTeacher(input: NewTeacherInput): Promise<TeacherProfile> {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { role: 'teacher', full_name: input.fullName.trim() } },
  });
  if (signUpError) throw signUpError;

  const teacherId = signUpData.user?.id;
  if (!teacherId) throw new Error('Could not create that account. Please try again.');
  if (signUpData.session) {
    throw new Error(
      'That account was created, but Supabase returned an active session for it — ' +
        '"Enable email confirmations" is probably off in Authentication settings. ' +
        'Turn it back on before creating more staff accounts this way.',
    );
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      teaching_level: input.level,
      teaching_class: input.level === 'primary' ? (input.classroom ?? null) : null,
      teaching_subject: input.level === 'secondary' ? (input.subject ?? null) : null,
    })
    .eq('id', teacherId);
  if (profileError) throw profileError;

  const assignedStudentIds = await assignTeacherStudents(teacherId, input);

  return {
    id: teacherId,
    name: input.fullName.trim(),
    assignedStudentIds,
    teachingLevel: input.level,
    teachingClass: input.level === 'primary' ? (input.classroom ?? null) : null,
    teachingSubject: input.level === 'secondary' ? (input.subject ?? null) : null,
  };
}

async function assignTeacherStudents(
  teacherId: string,
  input: { level: 'primary' | 'secondary'; classroom?: string; studentIds?: string[] },
): Promise<string[]> {
  const studentIds =
    input.level === 'primary'
      ? ((await supabase.from('students').select('id').eq('classroom', input.classroom ?? '')).data ?? []).map(
          (r) => r.id as string,
        )
      : input.studentIds ?? [];

  if (studentIds.length > 0) {
    const { error } = await supabase
      .from('teacher_students')
      .insert(studentIds.map((studentId) => ({ teacher_user_id: teacherId, student_id: studentId })));
    if (error) throw error;
  }
  return studentIds;
}

/** Re-derives a teacher's class/subject and student roster from scratch —
 *  clears their existing assignments first so changing classroom/subject
 *  doesn't leave stale access behind. */
export async function updateTeacherAssignment(
  teacherId: string,
  input: { level: 'primary' | 'secondary'; classroom?: string; subject?: string; studentIds?: string[] },
): Promise<string[]> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      teaching_level: input.level,
      teaching_class: input.level === 'primary' ? (input.classroom ?? null) : null,
      teaching_subject: input.level === 'secondary' ? (input.subject ?? null) : null,
    })
    .eq('id', teacherId);
  if (profileError) throw profileError;

  const { error: clearError } = await supabase.from('teacher_students').delete().eq('teacher_user_id', teacherId);
  if (clearError) throw clearError;

  return assignTeacherStudents(teacherId, input);
}

function mapEvent(row: Record<string, unknown>): SchoolEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    time: row.time as string,
    location: row.location as string,
    category: row.category as SchoolEvent['category'],
    description: row.description as string,
    organizer: row.organizer as string,
  };
}

export async function fetchEvents(): Promise<SchoolEvent[]> {
  const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export interface NewStudentInput {
  name: string;
  studentId: string;
  gradeLevel: string;
  classroom: string;
  rollNumber: number;
  dateOfBirth: string;
  enrollmentDate: string;
  house: StudentProfile['house'];
  parentName: string;
  parentEmail: string;
  avatarUrl: string;
  clubs: string[];
}

export async function createStudent(input: NewStudentInput): Promise<StudentProfile> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      student_code: input.studentId,
      name: input.name,
      grade_level: input.gradeLevel,
      classroom: input.classroom,
      roll_number: input.rollNumber,
      date_of_birth: input.dateOfBirth || null,
      enrollment_date: input.enrollmentDate || null,
      house: input.house,
      parent_name: input.parentName,
      parent_email: input.parentEmail,
      avatar_url: input.avatarUrl,
      clubs: input.clubs,
    })
    .select('*, grades(*)')
    .single();
  if (error) throw error;
  return mapStudent(data as StudentRow);
}

/** Best-effort: throws with a friendly message if no account exists yet for that email. */
export async function linkParentByEmail(studentId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('link_parent_by_email', {
    p_student_id: studentId,
    p_email: email.trim(),
  });
  if (error) throw error;
}

export async function updateStudentRemarks(
  studentId: string,
  fields: { teacherRemarks: string; generalStatus: StudentProfile['generalStatus'] },
): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ teacher_remarks: fields.teacherRemarks, general_status: fields.generalStatus })
    .eq('id', studentId);
  if (error) throw error;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw error;
}

export async function addGrade(
  studentId: string,
  grade: { subject: string; score: number; teacher: string; term: GradeRecord['term'] },
): Promise<GradeRecord> {
  const { data, error } = await supabase
    .from('grades')
    .insert({
      student_id: studentId,
      subject: grade.subject,
      score: grade.score,
      teacher: grade.teacher,
      term: grade.term,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGrade(data as GradeRow);
}

export async function deleteGrade(gradeId: string): Promise<void> {
  const { error } = await supabase.from('grades').delete().eq('id', gradeId);
  if (error) throw error;
}

export async function addEvent(event: Omit<SchoolEvent, 'id'>): Promise<SchoolEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      category: event.category,
      description: event.description,
      organizer: event.organizer,
    })
    .select()
    .single();
  if (error) throw error;
  return mapEvent(data as Record<string, unknown>);
}

interface ApplicationRow {
  id: string;
  child_name: string;
  date_of_birth: string | null;
  grade_applying_for: string;
  parent_name: string;
  parent_phone: string;
  notes: string;
  status: AdmissionApplication['status'];
  submitted_at: string;
}

function mapApplication(row: ApplicationRow): AdmissionApplication {
  return {
    id: row.id,
    childName: row.child_name,
    dateOfBirth: row.date_of_birth ?? '',
    gradeApplyingFor: row.grade_applying_for,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    notes: row.notes,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

/** Submitted by a signed-up parent whose account didn't auto-link to an
 *  existing student — this is how prospective families apply. The photo is
 *  optional and, if given, uploaded to an application-scoped path; it's
 *  moved over to the real student's path automatically once an admin
 *  approves the application (see approve_application() in schema.sql). */
export async function submitApplication(
  input: {
    childName: string;
    dateOfBirth: string;
    gradeApplyingFor: string;
    parentName: string;
    parentPhone: string;
    notes: string;
  },
  photoFile?: File | null,
): Promise<AdmissionApplication> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You must be signed in to apply.');

  const { data, error } = await supabase
    .from('admission_applications')
    .insert({
      applicant_user_id: userId,
      child_name: input.childName,
      date_of_birth: input.dateOfBirth || null,
      grade_applying_for: input.gradeApplyingFor,
      parent_name: input.parentName,
      parent_phone: input.parentPhone,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;
  const created = mapApplication(data as ApplicationRow);

  if (photoFile) {
    // The application itself is already submitted at this point — a failed
    // photo upload shouldn't roll that back, just surface as its own error.
    const path = `applications/${created.id}/avatar.${avatarFileExt(photoFile)}`;
    await uploadAvatarFile(path, photoFile);
    const { error: updateError } = await supabase
      .from('admission_applications')
      .update({ avatar_path: path })
      .eq('id', created.id);
    if (updateError) throw updateError;
  }

  return created;
}

/**
 * RLS scopes this per caller (see supabase/schema.sql): a parent sees only
 * their own submissions, an admin sees every application. Same query works
 * for both — App.tsx uses it for both ParentPortal's own-status view and
 * AdminPortal's review queue.
 */
export async function fetchApplications(): Promise<AdmissionApplication[]> {
  const { data, error } = await supabase
    .from('admission_applications')
    .select('*')
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapApplication);
}

export async function rejectApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('admission_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw error;
}

/** Creates the real student record (admin confirms official placement),
 *  links it to the applicant's account, and marks the application accepted —
 *  all atomically server-side. See approve_application() in schema.sql. */
export async function approveApplication(input: {
  applicationId: string;
  studentCode: string;
  gradeLevel: string;
  classroom: string;
  rollNumber: number;
  house: StudentProfile['house'];
}): Promise<string> {
  const { data, error } = await supabase.rpc('approve_application', {
    p_application_id: input.applicationId,
    p_student_code: input.studentCode,
    p_grade_level: input.gradeLevel,
    p_classroom: input.classroom,
    p_roll_number: input.rollNumber,
    p_house: input.house,
  });
  if (error) throw error;
  return data as string;
}
