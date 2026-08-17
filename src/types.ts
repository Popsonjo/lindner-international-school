export interface GradeRecord {
  id: string;
  subject: string;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  teacher: string;
  term: 'First Term' | 'Second Term' | 'Third Term';
  session: string; // Academic session/year, e.g. "2025/2026"
}

export interface AttendanceRecord {
  totalDays: number;
  present: number;
  absent: number;
  unexcused: number;
  percentage: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  studentId: string; // e.g. LIS-2026-001
  gradeLevel: string; // e.g. Grade 10
  classroom: string; // e.g. Room 402B
  rollNumber: number;
  dateOfBirth: string;
  enrollmentDate: string;
  house: 'Phoenix' | 'Griffin' | 'Pegasus' | 'Dragon';
  parentName: string;
  parentEmail: string;
  parentUserId: string | null; // Links to the parent's real Supabase Auth account, once created
  avatarUrl: string;
  clubs: string[];
  grades: GradeRecord[];
  attendance: AttendanceRecord;
  teacherRemarks: string;
  generalStatus: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical';
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 09:00 AM - 02:00 PM
  location: string;
  category: 'Academic' | 'Sports' | 'Arts' | 'Community' | 'Holiday' | 'Exams';
  description: string;
  organizer: string;
}

export interface TeacherProfile {
  id: string; // Supabase Auth user id
  name: string;
  assignedStudentIds: string[];
  teachingLevel: 'primary' | 'secondary' | null;
  teachingClass: string | null; // set when teachingLevel === 'primary'
  teachingSubject: string | null; // set when teachingLevel === 'secondary'
  teachingClasses: string[]; // set when teachingLevel === 'secondary' — may span multiple classes
}

/**
 * A prospective family's submission — deliberately not a StudentProfile.
 * Only becomes one once an admin approves it (see approve_application() in
 * supabase/schema.sql).
 */
export interface AdmissionApplication {
  id: string;
  childName: string;
  dateOfBirth: string;
  gradeApplyingFor: string;
  parentName: string;
  parentPhone: string;
  notes: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submittedAt: string;
}

export interface PortalUser {
  /** 'pending_parent' = a signed-in parent account not yet linked to a student
   *  (either awaiting admission review, or an admin hasn't linked them yet). */
  role: 'admin' | 'parent' | 'teacher' | 'pending_parent' | 'public';
  username?: string;
  email?: string; // The signed-in Supabase Auth email, used for password re-confirmation (e.g. Backroom)
  studentId?: string; // If parent
  studentName?: string; // If parent
  teacherId?: string; // If teacher — stable key used to re-validate the session
  assignedStudentIds?: string[]; // If teacher — always re-derived from the live roster
}
