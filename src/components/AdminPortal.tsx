import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Lock, Users, ShieldAlert, Search, Trash2, Save,
  UserPlus, FileText, Activity, AlertTriangle, ChevronRight, X, Sparkles, BookOpen, CheckCircle2, Link2,
  Inbox, Check, GraduationCap,
} from 'lucide-react';
import { AdmissionApplication, StudentProfile, GradeRecord, PortalUser, TeacherProfile } from '../types';
import { HOUSES } from '../data/mockData';
import { LoginOutcome } from '../lib/auth';
import { NewStudentInput, NewTeacherInput } from '../lib/api';
import { DEFAULT_AVATAR_URL } from '../lib/storage';
import { MAX_SCORE, MIN_SCORE, averageAttendance } from '../lib/grading';
import TeacherManagement from './TeacherManagement';

interface AdminPortalProps {
  students: StudentProfile[];
  user: PortalUser;
  onLogin: (email: string, password: string) => Promise<LoginOutcome>;
  onLogout: () => void;
  onReauthenticate: (password: string) => Promise<boolean>;
  onAddStudent: (input: NewStudentInput) => Promise<StudentProfile>;
  onLinkParent: (studentId: string, email: string) => Promise<void>;
  onUpdateRemarks: (
    studentId: string,
    fields: { teacherRemarks: string; generalStatus: StudentProfile['generalStatus'] },
  ) => Promise<void>;
  onAddGrade: (
    studentId: string,
    grade: { subject: string; score: number; teacher: string; term: GradeRecord['term'] },
  ) => Promise<GradeRecord>;
  onDeleteGrade: (gradeId: string) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  applications: AdmissionApplication[];
  onApproveApplication: (input: {
    applicationId: string;
    studentCode: string;
    gradeLevel: string;
    classroom: string;
    rollNumber: number;
    house: StudentProfile['house'];
  }) => Promise<string>;
  onRejectApplication: (applicationId: string) => Promise<void>;
  teachers: TeacherProfile[];
  onCreateTeacher: (input: NewTeacherInput) => Promise<TeacherProfile>;
  onUpdateTeacherAssignment: (
    teacherId: string,
    input: { level: 'primary' | 'secondary'; classroom?: string; subject?: string; studentIds?: string[] },
  ) => Promise<void>;
}

type Notice = { tone: 'success' | 'error'; text: string };

const STATUS_OPTIONS: StudentProfile['generalStatus'][] = [
  'Excellent',
  'Good',
  'Needs Improvement',
  'Critical',
];

/** Next roll number / student ID derived from the highest existing value.
 *  Deriving these from `students.length` produced duplicates as soon as any
 *  record had been deleted — and a duplicate studentId shows one family
 *  another family's child in the parent portal. */
function nextIdentifiers(students: readonly StudentProfile[]) {
  const rollNumber =
    students.reduce((max, s) => Math.max(max, Number(s.rollNumber) || 0), 0) + 1;

  const highestSequence = students.reduce((max, s) => {
    const match = /^LIS-\d{4}-(\d+)$/.exec(s.studentId);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  const year = new Date().getFullYear();
  const taken = new Set(students.map(s => s.studentId));
  let sequence = highestSequence + 1;
  let studentId = `LIS-${year}-${String(sequence).padStart(3, '0')}`;
  while (taken.has(studentId)) {
    sequence += 1;
    studentId = `LIS-${year}-${String(sequence).padStart(3, '0')}`;
  }

  return { rollNumber, studentId };
}

export default function AdminPortal({
  students, user, onLogin, onLogout, onReauthenticate, onAddStudent, onLinkParent,
  onUpdateRemarks, onAddGrade, onDeleteGrade, onDeleteStudent,
  applications, onApproveApplication, onRejectApplication,
  teachers, onCreateTeacher, onUpdateTeacherAssignment,
}: AdminPortalProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [showTeacherManagement, setShowTeacherManagement] = useState(false);
  const [showAdmissions, setShowAdmissions] = useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [approveGradeLevel, setApproveGradeLevel] = useState('Grade 9 - Foundation Year');
  const [approveClassroom, setApproveClassroom] = useState('Unassigned');
  const [approveHouse, setApproveHouse] = useState<StudentProfile['house']>('Phoenix');
  const [applicationBusyId, setApplicationBusyId] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState('');

  const pendingApplications = useMemo(
    () => applications.filter(a => a.status === 'submitted' || a.status === 'under_review'),
    [applications],
  );

  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher';

  // Memoised so the identity is stable — the roster used to be rebuilt on every
  // render, which re-fired the sync effect below and snapped a teacher's selection
  // back to their first student every time they clicked a different one.
  const availableStudents = useMemo(
    () =>
      isTeacher
        ? students.filter(stud => user.assignedStudentIds?.includes(stud.id))
        : students,
    [isTeacher, students, user.assignedStudentIds],
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const activeStudent =
    availableStudents.find(s => s.id === selectedStudentId) ?? availableStudents[0] ?? null;

  // Only correct the selection when it no longer points at a visible record.
  useEffect(() => {
    const stillVisible = availableStudents.some(s => s.id === selectedStudentId);
    if (!stillVisible) {
      setSelectedStudentId(availableStudents[0]?.id ?? null);
    }
  }, [availableStudents, selectedStudentId]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHouse, setFilterHouse] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');

  // Add Student form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGradeLevel, setAddGradeLevel] = useState('Grade 10 - Honors Track');
  const [addClassroom, setAddClassroom] = useState('Room 202');
  const [addDob, setAddDob] = useState('2010-01-01');
  const [addHouse, setAddHouse] = useState<StudentProfile['house']>('Phoenix');
  const [addParentName, setAddParentName] = useState('');
  const [addParentEmail, setAddParentEmail] = useState('');
  const [addClubs, setAddClubs] = useState('Chess Society, School Newsletter');
  const [addError, setAddError] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Linking a student to the parent's real Supabase Auth account (once it exists).
  const [linkEmailDraft, setLinkEmailDraft] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [showBackroom, setShowBackroom] = useState(false);
  const [backroomPassword, setBackroomPassword] = useState('');
  const [backroomError, setBackroomError] = useState('');
  const [backroomUnlocked, setBackroomUnlocked] = useState(false);
  const [backroomBusy, setBackroomBusy] = useState(false);

  // Inline feedback replaces the blocking window.alert() calls.
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const flash = useCallback((tone: Notice['tone'], text: string) => {
    setNotice({ tone, text });
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  // Subject update form states
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState<StudentProfile['generalStatus']>('Good');

  // Add Grade states — the score is held as text so a half-typed value cannot
  // silently collapse to 0.
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjScore, setNewSubjScore] = useState('85');
  const [newSubjTeacher, setNewSubjTeacher] = useState('');

  const activeStudentId = activeStudent?.id ?? null;

  // Re-sync the editors when a *different* student is selected. Keying on the id
  // rather than the object means an unrelated update (adding a grade, say) no
  // longer wipes a remark that is mid-edit.
  useEffect(() => {
    const current = availableStudents.find(s => s.id === activeStudentId);
    setEditRemarks(current?.teacherRemarks ?? '');
    setEditStatus(current?.generalStatus ?? 'Good');
    setLinkEmailDraft(current?.parentEmail ?? '');
    setLinkError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  // Close the backroom if the session ever stops being an administrator one.
  useEffect(() => {
    if (!isAdmin) {
      setShowBackroom(false);
      setBackroomUnlocked(false);
      setBackroomPassword('');
      setBackroomError('');
    }
  }, [isAdmin]);

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    const result = await onLogin(loginEmail, loginPassword);
    setLoginBusy(false);
    if (result.ok) {
      setLoginError('');
      setLoginPassword('');
      return;
    }
    setLoginError(result.message);
    setLoginPassword('');
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const name = addName.trim();
    const parentName = addParentName.trim();
    const parentEmail = addParentEmail.trim();

    if (!name || !parentName) {
      setAddError('Student name and parent name are both required.');
      return;
    }
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      setAddError('Please enter a valid parent email address, or leave it blank.');
      return;
    }

    const { rollNumber, studentId } = nextIdentifiers(students);

    setAddBusy(true);
    try {
      const created = await onAddStudent({
        name,
        studentId,
        gradeLevel: addGradeLevel,
        classroom: addClassroom.trim() || 'Unassigned',
        rollNumber,
        dateOfBirth: addDob,
        enrollmentDate: new Date().toISOString().split('T')[0],
        house: addHouse,
        parentName,
        parentEmail: parentEmail || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        avatarUrl: DEFAULT_AVATAR_URL,
        clubs: addClubs.split(',').map(c => c.trim()).filter(Boolean),
      });

      setSelectedStudentId(created.id);
      setShowAddModal(false);
      setAddError('');

      // Best-effort: only succeeds once the parent's own Supabase login already
      // exists. If it doesn't yet, the student record is still created fine —
      // admin can link it later from the student's detail panel.
      let linkNote = '';
      if (parentEmail) {
        try {
          await onLinkParent(created.id, parentEmail);
          linkNote = ' Parent account linked.';
        } catch {
          linkNote = ' Parent account not linked yet — create their login in Supabase, then link it from the student detail panel.';
        }
      }
      flash('success', `${name} admitted as ${studentId}.${linkNote}`);

      // Reset fields
      setAddName('');
      setAddParentName('');
      setAddParentEmail('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not create the student record.');
    } finally {
      setAddBusy(false);
    }
  };

  const handleLinkParent = async () => {
    if (!activeStudent || !isAdmin) return;
    const email = linkEmailDraft.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLinkError('Enter a valid email address.');
      return;
    }
    setLinkBusy(true);
    setLinkError('');
    try {
      await onLinkParent(activeStudent.id, email);
      flash('success', `Linked ${activeStudent.name}'s record to ${email}.`);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not link that account.');
    } finally {
      setLinkBusy(false);
    }
  };

  const handleBackroomVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-assert the role here: the gate must not depend only on the modal being
    // rendered from an admin branch.
    if (!isAdmin) {
      setBackroomUnlocked(false);
      setBackroomError('Backroom access is restricted to administrator sessions.');
      return;
    }
    setBackroomBusy(true);
    const ok = await onReauthenticate(backroomPassword);
    setBackroomBusy(false);
    if (ok) {
      setBackroomUnlocked(true);
      setBackroomError('');
    } else {
      setBackroomUnlocked(false);
      setBackroomError('Access denied. Please re-enter your account password.');
    }
    setBackroomPassword('');
  };

  const handleCloseBackroom = () => {
    setShowBackroom(false);
    setBackroomUnlocked(false);
    setBackroomPassword('');
    setBackroomError('');
  };

  const handleUpdateRemarksAndStatus = async () => {
    if (!activeStudent || !isAdmin) return;
    try {
      // Assigned directly rather than `|| existing`, so remarks can actually be cleared.
      await onUpdateRemarks(activeStudent.id, { teacherRemarks: editRemarks.trim(), generalStatus: editStatus });
      flash('success', `Remarks and standing updated for ${activeStudent.name}.`);
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Could not save those updates.');
    }
  };

  const handleAddGradeRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !isAdmin) return;

    const subject = newSubjName.trim();
    const teacher = newSubjTeacher.trim();
    if (!subject || !teacher) {
      flash('error', 'Subject and instructor are both required.');
      return;
    }
    if (activeStudent.grades.some(g => g.subject.toLowerCase() === subject.toLowerCase())) {
      flash('error', `${activeStudent.name} already has a record for "${subject}".`);
      return;
    }

    const parsed = Number(newSubjScore);
    if (!Number.isFinite(parsed) || parsed < MIN_SCORE || parsed > MAX_SCORE) {
      flash('error', `Score must be a number between ${MIN_SCORE} and ${MAX_SCORE}.`);
      return;
    }

    try {
      await onAddGrade(activeStudent.id, { subject, score: parsed, teacher, term: 'Term 2' });
      flash('success', `${subject} recorded for ${activeStudent.name}.`);
      setNewSubjName('');
      setNewSubjScore('85');
      setNewSubjTeacher('');
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Could not save that grade.');
    }
  };

  const handleDeleteGradeRecord = async (gradeId: string) => {
    if (!activeStudent || !isAdmin) return;
    try {
      await onDeleteGrade(gradeId);
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Could not delete that grade.');
    }
  };

  const handleDeleteStudentProfile = async (studentId: string) => {
    if (!isAdmin) return;
    const target = students.find(s => s.id === studentId);
    if (!target) return;
    if (!window.confirm(`Decommission the ledger for ${target.name}? This cannot be undone.`)) return;

    try {
      await onDeleteStudent(studentId);
      setSelectedStudentId(availableStudents.find(s => s.id !== studentId)?.id ?? null);
      flash('success', `${target.name}'s record has been removed.`);
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Could not delete that record.');
    }
  };

  const handleStartApprove = (app: AdmissionApplication) => {
    setExpandedApplicationId(app.id);
    setApproveGradeLevel(app.gradeApplyingFor);
    setApproveClassroom('Unassigned');
    setApproveHouse('Phoenix');
    setApplicationError('');
  };

  const handleConfirmApprove = async (app: AdmissionApplication) => {
    if (!isAdmin) return;
    setApplicationBusyId(app.id);
    setApplicationError('');
    try {
      const { rollNumber, studentId } = nextIdentifiers(students);
      await onApproveApplication({
        applicationId: app.id,
        studentCode: studentId,
        gradeLevel: approveGradeLevel,
        classroom: approveClassroom.trim() || 'Unassigned',
        rollNumber,
        house: approveHouse,
      });
      setExpandedApplicationId(null);
      flash('success', `${app.childName} admitted as ${studentId}. Their parent account is now linked.`);
    } catch (err) {
      setApplicationError(err instanceof Error ? err.message : 'Could not approve that application.');
    } finally {
      setApplicationBusyId(null);
    }
  };

  const handleReject = async (app: AdmissionApplication) => {
    if (!isAdmin) return;
    if (!window.confirm(`Reject the application for ${app.childName}?`)) return;
    setApplicationBusyId(app.id);
    try {
      await onRejectApplication(app.id);
      flash('success', `Application for ${app.childName} rejected.`);
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Could not reject that application.');
    } finally {
      setApplicationBusyId(null);
    }
  };

  const selectStudent = (id: string) => setSelectedStudentId(id);

  // Filter students
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredStudentsList = availableStudents.filter(stud => {
    const matchesSearch =
      !normalizedSearch ||
      stud.name.toLowerCase().includes(normalizedSearch) ||
      stud.studentId.toLowerCase().includes(normalizedSearch) ||
      stud.parentName.toLowerCase().includes(normalizedSearch);
    const matchesHouse = filterHouse === 'All' || stud.house === filterHouse;
    const matchesLevel = filterLevel === 'All' || stud.gradeLevel.includes(filterLevel);
    return matchesSearch && matchesHouse && matchesLevel;
  });

  // Aggregates
  const totalEnrolled = availableStudents.length;
  const criticalCounter = availableStudents.filter(
    s => s.generalStatus === 'Critical' || s.generalStatus === 'Needs Improvement',
  ).length;
  const cohortAttendance = averageAttendance(availableStudents);

  // If guest mode, show Admin / Teacher login gate
  if (!isAdmin && !isTeacher) {
    return (
      <div id="admin-login" className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="bg-navy-700 text-white p-8 text-center space-y-2">
            <div className="bg-navy-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-gold-400/30">
              <Lock className="w-8 h-8 text-gold-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">Staff Access Gate</h2>
            <p className="text-xs text-[#EAF5F2] font-light max-w-xs mx-auto">
              Sign in with your administrator or teacher account to access the campus staff portal. Teachers only see their assigned students.
            </p>
          </div>

          <form onSubmit={handleAdminVerify} className="p-8 space-y-4">
            {loginError && (
              <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="staff-email" className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-sans">
                Staff Email
              </label>
              <input
                id="staff-email"
                type="email"
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@lindner.edu"
                className="w-full text-sm pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#16305F] placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="staff-password" className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-sans">
                Password
              </label>
              <input
                id="staff-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full text-sm pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#16305F] placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-3.5 bg-[#16305F] hover:bg-[#1E4C8F] text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {loginBusy ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-portal-dashboard" className="space-y-8">
      {/* Admin Title Block Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#16305F]" />
            <span>{isTeacher ? 'Teacher Student Dashboard' : 'LIS Student Registrar & Academic Management'}</span>
          </h2>
          <p className="text-sm text-slate-500 font-light">
            {isTeacher
              ? 'Review your assigned student caseload, attendance, and term performance details.'
              : 'Enact student additions, configure term outcomes/scores, update tutor files, and manage student registries.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={() => { setAddError(''); setShowAddModal(true); }}
                className="px-4 py-2.5 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Admit New Scholar</span>
              </button>
              <button
                onClick={() => setShowAdmissions(true)}
                className="relative px-3.5 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Inbox className="w-4 h-4" />
                <span>Admissions</span>
                {pendingApplications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingApplications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTeacherManagement(true)}
                className="px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Teachers</span>
              </button>
              <button
                onClick={() => setShowBackroom(true)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-gold-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Backroom</span>
              </button>
            </>
          )}
          <button
            onClick={onLogout}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200/40"
          >
            Log Out Console
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
            notice.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notice.tone === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Aggregate Statistics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Metric 1: Total Scholars */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-[#16305F]/10 text-[#16305F] p-3 rounded-xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{isTeacher ? 'Assigned Scholars' : 'Intake Enrollment'}</span>
            <span className="text-2xl font-serif font-bold text-slate-800 block">{totalEnrolled} {isTeacher ? 'Assigned Students' : 'Registered Students'}</span>
          </div>
        </div>

        {/* Metric 2: Average attendance rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-gold-50 text-gold-700 p-3 rounded-xl shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cohort Mean Attendance</span>
            <span className="text-2xl font-serif font-bold text-slate-800 block">{cohortAttendance}% Global Average</span>
          </div>
        </div>

        {/* Metric 3: Critical tracking flags */}
        <div className="bg-white p-6 rounded-2xl border border-[#FA5252]/10 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 text-[#FA5252] p-3 rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Special Review Alerts</span>
            <span className="text-2xl font-serif font-bold text-rose-800 block">{criticalCounter} Under Review Status</span>
          </div>
        </div>

      </section>

      {/* Master/Detail Split Layout Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left pane: Scholar Directory list */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden space-y-4 p-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono border-b border-slate-100 pb-2.5">
            {isTeacher ? 'Assigned Student Roster' : 'Cohort Directory List'}
          </h3>

          {/* Quick Filter Inputs */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search scholar registers..."
                aria-label="Search scholar registers"
                className="w-full text-[11px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16305F] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={filterHouse}
                onChange={(e) => setFilterHouse(e.target.value)}
                aria-label="Filter by house"
                className="text-[10px] p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="All">All Houses</option>
                <option value="Phoenix">Phoenix</option>
                <option value="Griffin">Griffin</option>
                <option value="Pegasus">Pegasus</option>
                <option value="Dragon">Dragon</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                aria-label="Filter by grade level"
                className="text-[10px] p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="All">All Levels</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>
          </div>

          {/* Actual Scroll List */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredStudentsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-light italic text-center py-6">
                No matching scholar records matched.
              </p>
            ) : (
              filteredStudentsList.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => selectStudent(st.id)}
                  aria-pressed={activeStudent?.id === st.id}
                  className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                    activeStudent?.id === st.id
                      ? 'bg-slate-50 border-[#16305F]/40 ring-1 ring-[#16305F]/20'
                      : 'bg-white hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <img
                    src={st.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{st.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{st.gradeLevel}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                    activeStudent?.id === st.id ? 'text-[#16305F] translate-x-0.5' : 'text-slate-300'
                  }`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right pane: Detailed Biographical and score inspector (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {activeStudent ? (
            <div className="space-y-8">

              {/* Header section details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <img
                    src={activeStudent.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 shadow-sm"
                  />
                  <div>
                    <h3 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{activeStudent.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-gradient-to-r ${HOUSES[activeStudent.house]?.color || 'from-slate-600 to-slate-800 bg-slate-50 text-white'}`}>
                        {activeStudent.house}
                      </span>
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Student ID: <span className="font-bold text-slate-600">{activeStudent.studentId}</span>
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteStudentProfile(activeStudent.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 text-rose-800 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Profile Ledger</span>
                  </button>
                )}
              </div>

              {/* biographical & login data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <div className="space-y-2 text-xs">
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#16305F]" />
                    <span>Bio-Details & Registrations</span>
                  </h4>
                  <p className="text-slate-600">Grade Placement: <strong className="font-semibold text-slate-800">{activeStudent.gradeLevel}</strong></p>
                  <p className="text-slate-600">Home/Form Room: <strong className="font-semibold text-slate-800">{activeStudent.classroom}</strong></p>
                  <p className="text-slate-600">Date of Birth: <strong className="font-semibold text-slate-800 font-mono">{activeStudent.dateOfBirth || '—'}</strong></p>
                  <p className="text-slate-600">Enrolled: <strong className="font-semibold text-slate-800 font-mono">{activeStudent.enrollmentDate || '—'}</strong></p>
                </div>

                <div className="space-y-2 text-xs border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-3 sm:pt-0 sm:pl-5">
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-gold-600" />
                    <span>Parent Portal Login Gate</span>
                  </h4>
                  <p className="text-slate-600 font-mono">Parent Contact Name: <strong className="font-semibold text-slate-800 font-sans">{activeStudent.parentName}</strong></p>
                  <p className="text-slate-600">Authorized Email: <strong className="font-semibold text-slate-800">{activeStudent.parentEmail}</strong></p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-slate-600">Portal Account:</span>
                    {activeStudent.parentUserId ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Linked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Not linked
                      </span>
                    )}
                  </div>

                  {isAdmin && !activeStudent.parentUserId && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Create the parent's login in Supabase Authentication first, then link it here by email.
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="email"
                          value={linkEmailDraft}
                          onChange={(e) => setLinkEmailDraft(e.target.value)}
                          placeholder="parent@example.com"
                          className="flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                        />
                        <button
                          type="button"
                          onClick={handleLinkParent}
                          disabled={linkBusy}
                          className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{linkBusy ? 'Linking…' : 'Link'}</span>
                        </button>
                      </div>
                      {linkError && <p className="text-[10px] text-rose-600">{linkError}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Grades outcomes configuration panel */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#16305F]" />
                  <span>Interactive Term Grades Modifier & Course Registry</span>
                </h4>

                <div className="space-y-3.5">
                  {activeStudent.grades.length === 0 && (
                    <p className="text-xs text-slate-400 font-light italic py-2">
                      No subject records on file for this scholar yet.
                    </p>
                  )}
                  {activeStudent.grades.map((g) => (
                    <div key={g.id} className="flex justify-between items-center gap-4 py-2 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50/50 px-2 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{g.subject}</p>
                        <p className="text-[10px] text-slate-400 font-light">Taught by: {g.teacher}</p>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0">
                        <span className="text-xs font-medium text-slate-600 font-mono">
                          Score: <strong className="text-slate-950 font-bold">{g.score}/100</strong>
                        </span>

                        <span className="w-8 text-center font-bold font-mono text-xs text-[#16305F] bg-[#16305F]/10 px-2 py-0.5 rounded border border-[#16305F]/20">
                          {g.grade}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteGradeRecord(g.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                            title={`Remove ${g.subject}`}
                            aria-label={`Remove ${g.subject}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit New Segment Inline Form */}
                {isAdmin && (
                  <form onSubmit={handleAddGradeRecord} className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-3 mt-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono block">
                      Add Subject Segment
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        required
                        value={newSubjName}
                        onChange={(e) => setNewSubjName(e.target.value)}
                        placeholder="e.g. World History"
                        aria-label="Subject name"
                        className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                      />
                      <input
                        type="text"
                        required
                        value={newSubjTeacher}
                        onChange={(e) => setNewSubjTeacher(e.target.value)}
                        placeholder="e.g., Mr. David Chen"
                        aria-label="Instructor name"
                        className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                      />

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          step={1}
                          required
                          value={newSubjScore}
                          onChange={(e) => setNewSubjScore(e.target.value)}
                          aria-label={`Score between ${MIN_SCORE} and ${MAX_SCORE}`}
                          className="text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16305F] w-20 text-center font-bold"
                        />
                        <button
                          type="submit"
                          className="flex-1 py-1 px-3 bg-[#16305F] hover:bg-[#1E4C8F] text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Add Grade
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Remarks update */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                  Biographical Remarks & Standing Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="counselor-remarks" className="text-[10px] font-bold text-slate-500 block">Class Counselor Remarks</label>
                    <textarea
                      id="counselor-remarks"
                      rows={2}
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      // Read-only for teachers: the editor used to accept input but had
                      // no save control, so every edit was silently discarded.
                      readOnly={!isAdmin}
                      className={`w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F] ${
                        isAdmin ? '' : 'bg-slate-50 text-slate-500 cursor-not-allowed'
                      }`}
                      placeholder="Input diagnostic summary profile notes..."
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-1">
                    <label htmlFor="standing-status" className="text-[10px] font-bold text-slate-500 block">Current Standing</label>
                    <select
                      id="standing-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as StudentProfile['generalStatus'])}
                      disabled={!isAdmin}
                      className={`w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#16305F] font-medium ${
                        isAdmin ? 'bg-white' : 'bg-slate-50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>

                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={handleUpdateRemarksAndStatus}
                        className="w-full py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Commit Updates</span>
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-light leading-snug">
                        Read-only. Contact the registrar to amend remarks or standing.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-4 font-light">
              <span className="text-xl block">No registry cataloged.</span>
              {isAdmin ? (
                <button
                  onClick={() => { setAddError(''); setShowAddModal(true); }}
                  className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white text-xs font-semibold rounded-lg"
                >
                  Intake First Scholar
                </button>
              ) : (
                <p className="text-xs text-slate-400">Your assigned student roster is currently empty.</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Teacher management modal — administrators only */}
      {showTeacherManagement && isAdmin && (
        <TeacherManagement
          students={students}
          teachers={teachers}
          onClose={() => setShowTeacherManagement(false)}
          onCreateTeacher={onCreateTeacher}
          onUpdateTeacherAssignment={onUpdateTeacherAssignment}
        />
      )}

      {/* Admissions review modal — administrators only */}
      {showAdmissions && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Admissions Review">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="bg-[#16305F] text-white p-5 flex items-center justify-between shrink-0">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <Inbox className="w-5 h-5 text-gold-400" />
                <span>Admissions Review</span>
              </h3>
              <button
                onClick={() => { setShowAdmissions(false); setExpandedApplicationId(null); }}
                aria-label="Close admissions review"
                className="text-gold-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {pendingApplications.length === 0 ? (
                <p className="text-sm text-slate-400 font-light italic text-center py-8">
                  No applications awaiting review.
                </p>
              ) : (
                pendingApplications.map(app => (
                  <div key={app.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{app.childName}</p>
                        <p className="text-xs text-slate-500">
                          Applying for {app.gradeApplyingFor} · DOB {app.dateOfBirth || '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Parent: {app.parentName} · {app.parentPhone}
                        </p>
                        {app.notes && (
                          <p className="text-xs text-slate-400 italic mt-1">"{app.notes}"</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          Submitted {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {expandedApplicationId !== app.id && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartApprove(app)}
                            disabled={applicationBusyId === app.id}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            disabled={applicationBusyId === app.id}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-60"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {expandedApplicationId === app.id && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                        {applicationError && (
                          <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{applicationError}</span>
                          </div>
                        )}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Confirm official placement before enrolling
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Grade Placement</label>
                            <select
                              value={approveGradeLevel}
                              onChange={(e) => setApproveGradeLevel(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none"
                            >
                              <option value="Grade 9 - Foundation Year">Grade 9 - Foundation</option>
                              <option value="Grade 10 - Honors Track">Grade 10 - Honors</option>
                              <option value="Grade 11 - IB Science Track">Grade 11 - IB Sciences</option>
                              <option value="Grade 12 - Liberal Arts Track">Grade 12 - Liberal Arts</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Classroom</label>
                            <input
                              type="text"
                              value={approveClassroom}
                              onChange={(e) => setApproveClassroom(e.target.value)}
                              placeholder="e.g. Room 302"
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">House</label>
                            <select
                              value={approveHouse}
                              onChange={(e) => setApproveHouse(e.target.value as StudentProfile['house'])}
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none"
                            >
                              <option value="Phoenix">Phoenix</option>
                              <option value="Griffin">Griffin</option>
                              <option value="Pegasus">Pegasus</option>
                              <option value="Dragon">Dragon</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedApplicationId(null)}
                            className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmApprove(app)}
                            disabled={applicationBusyId === app.id}
                            className="px-3 py-1.5 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-lg text-xs font-semibold disabled:opacity-60"
                          >
                            {applicationBusyId === app.id ? 'Enrolling…' : 'Confirm Enrollment'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backroom access modal — administrators only */}
      {showBackroom && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Backroom Control Room">
          <div className="bg-slate-950 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-slate-100">
            <div className="bg-navy-900 p-5 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-400" />
                  Backroom Control Room
                </h3>
                <p className="text-sm text-slate-400 max-w-xl leading-snug">
                  Only approved administrators may unlock the backroom access board. Use the backroom passcode to view secure logs and emergency controls.
                </p>
              </div>
              <button
                onClick={handleCloseBackroom}
                aria-label="Close backroom"
                className="text-slate-300 hover:text-white p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!backroomUnlocked ? (
                <form onSubmit={handleBackroomVerify} className="space-y-4">
                  {backroomError && (
                    <div role="alert" className="bg-rose-950/70 border border-rose-700 text-rose-200 p-3 rounded-xl text-sm">
                      {backroomError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="backroom-password" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Re-enter Your Password</label>
                    <input
                      id="backroom-password"
                      type="password"
                      autoComplete="current-password"
                      value={backroomPassword}
                      onChange={(e) => setBackroomPassword(e.target.value)}
                      placeholder="Confirm it's really you"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <p className="text-[11px] text-slate-500">Available only to administrator sessions.</p>
                    <button
                      type="submit"
                      disabled={backroomBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-400 px-5 py-3 text-sm font-semibold text-navy-950 hover:bg-gold-500 transition-colors disabled:opacity-60"
                    >
                      {backroomBusy ? 'Checking…' : 'Unlock Backroom'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Hidden Audit</p>
                      <p className="mt-3 text-3xl font-serif font-bold text-emerald-300">{totalEnrolled}</p>
                      <p className="text-sm text-slate-400 mt-1">Records under active confidentiality</p>
                    </div>
                    <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Emergency Override</p>
                      <p className="mt-3 text-3xl font-serif font-bold text-amber-300">Enabled</p>
                      <p className="text-sm text-slate-400 mt-1">Critical registry access mode</p>
                    </div>
                    <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Secure Channel</p>
                      <p className="mt-3 text-3xl font-serif font-bold text-sky-300">Active</p>
                      <p className="text-sm text-slate-400 mt-1">Confidential communications ready</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-100">Backroom Command Deck</h4>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-xs">1</span>
                        <span>Review confidential student oversight logs and escalation notes.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-xs">2</span>
                        <span>Execute emergency roster resets or secure data snapshots.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-xs">3</span>
                        <span>Generate sealed access seals for staff-only coordination.</span>
                      </li>
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => flash('success', 'Backroom logs exported. (Mock simulation)')}
                        className="w-full rounded-2xl bg-gold-400 px-4 py-3 text-sm font-semibold text-navy-950 hover:bg-gold-500 transition-colors"
                      >
                        Export Secure Log
                      </button>
                      <button
                        onClick={handleCloseBackroom}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900 transition-colors"
                      >
                        Close Backroom
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Scholar intake Modal — administrators only */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Admit New Student Profile">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-[#16305F] text-white p-5 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold-400" />
                <span>Admit New Student Profile</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close intake form"
                className="text-gold-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <p className="text-[11px] text-slate-400 leading-normal">
                Admitting a new student generates automatic registry and roll placement indices. If the parent's Supabase login already exists, entering their email links it immediately — otherwise link it later from the student's detail panel.
              </p>

              {addError && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label htmlFor="add-name" className="text-xs font-bold text-slate-700 block">Student Name</label>
                  <input
                    id="add-name"
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="add-grade" className="text-xs font-bold text-slate-700 block">Grade Placement</label>
                  <select
                    id="add-grade"
                    value={addGradeLevel}
                    onChange={(e) => setAddGradeLevel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none"
                  >
                    <option value="Grade 9 - Foundation Year">Grade 9 - Foundation</option>
                    <option value="Grade 10 - Honors Track">Grade 10 - Honors</option>
                    <option value="Grade 11 - IB Science Track">Grade 11 - IB Sciences</option>
                    <option value="Grade 12 - Liberal Arts Track">Grade 12 - Liberal Arts</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="add-house" className="text-xs font-bold text-slate-700 block">School House Guild</label>
                  <select
                    id="add-house"
                    value={addHouse}
                    onChange={(e) => setAddHouse(e.target.value as StudentProfile['house'])}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none"
                  >
                    <option value="Phoenix">Phoenix</option>
                    <option value="Griffin">Griffin</option>
                    <option value="Pegasus">Pegasus</option>
                    <option value="Dragon">Dragon</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="add-dob" className="text-xs font-bold text-slate-700 block">Date of Birth</label>
                  <input
                    id="add-dob"
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={addDob}
                    onChange={(e) => setAddDob(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="add-classroom" className="text-xs font-bold text-slate-700 block">Classroom Assignment</label>
                  <input
                    id="add-classroom"
                    type="text"
                    required
                    value={addClassroom}
                    onChange={(e) => setAddClassroom(e.target.value)}
                    placeholder="e.g. Room 302"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label htmlFor="add-parent-name" className="text-xs font-bold block text-gold-700">Authorized Parent Full Name</label>
                  <input
                    id="add-parent-name"
                    type="text"
                    required
                    value={addParentName}
                    onChange={(e) => setAddParentName(e.target.value)}
                    placeholder="e.g. Julianne Vance"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label htmlFor="add-parent-email" className="text-xs font-bold text-slate-700 block">Parent Email</label>
                  <input
                    id="add-parent-email"
                    type="email"
                    value={addParentEmail}
                    onChange={(e) => setAddParentEmail(e.target.value)}
                    placeholder="e.g. parent.email@mail.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Optional. If their Supabase login exists yet, this links the record now.</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <label htmlFor="add-clubs" className="text-xs font-bold text-slate-700 block">Clubs / Co-curricular (comma separated)</label>
                  <input
                    id="add-clubs"
                    type="text"
                    value={addClubs}
                    onChange={(e) => setAddClubs(e.target.value)}
                    placeholder="Debating, Chess Team, swimming"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs"
                >
                  Cancel Selection
                </button>
                <button
                  type="submit"
                  disabled={addBusy}
                  className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-lg text-xs font-semibold disabled:opacity-60"
                >
                  {addBusy ? 'Admitting…' : 'Commit New Scholar Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
