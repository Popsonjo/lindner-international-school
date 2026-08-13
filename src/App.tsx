import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { PortalUser } from './types';
import { supabase } from './lib/supabaseClient';
import { LoginOutcome, SignUpOutcome, resolveSessionUser, signIn, signOut, signUp } from './lib/auth';
import {
  NewStudentInput,
  addEvent,
  addGrade,
  approveApplication,
  createStudent,
  deleteGrade,
  deleteStudent,
  fetchApplications,
  fetchEvents,
  fetchStudents,
  fetchTeachers,
  linkParentByEmail,
  rejectApplication,
  submitApplication,
  updateStudentRemarks,
  uploadStudentAvatar,
} from './lib/api';
import HeaderNav from './components/HeaderNav';
import HomeSection from './components/HomeSection';
import CalendarSection from './components/CalendarSection';
import ParentPortal from './components/ParentPortal';
import AdminPortal from './components/AdminPortal';
import Footer from './components/Footer';
import ScrollToHash from './components/ScrollToHash';
import AboutSection from './components/pages/AboutSection';
import AcademicsSection from './components/pages/AcademicsSection';
import BeyondAcademicsSection from './components/pages/BeyondAcademicsSection';
import NurseryPrimarySection from './components/pages/NurseryPrimarySection';
import NewsEventsSection from './components/pages/NewsEventsSection';
import CampusLifeSection from './components/pages/CampusLifeSection';
import AdmissionsSection from './components/pages/AdmissionsSection';
import AlumniSection from './components/pages/AlumniSection';
import type { AdmissionApplication, GradeRecord, SchoolEvent, StudentProfile } from './types';

export default function App() {
  const location = useLocation();

  const [session, setSessionState] = useState<Session | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [user, setUser] = useState<PortalUser>({ role: 'public' });

  // Track the live Supabase Auth session. Every request the client library
  // makes after this carries the session's JWT, so Row Level Security
  // (supabase/schema.sql) is what actually scopes every query below — this
  // app never has to filter rows itself the way the old localStorage version did.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionState(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSessionState(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Re-fetch everything whenever the session changes (login, logout, token
  // refresh). A logged-out visitor still gets `events` back (public read),
  // and an empty `students`/`teachers` (both scoped to authenticated users).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [freshStudents, freshTeachers, freshEvents, freshApplications] = await Promise.all([
        fetchStudents().catch(() => []),
        fetchTeachers().catch(() => []),
        fetchEvents().catch(() => []),
        fetchApplications().catch(() => []),
      ]);
      if (cancelled) return;
      setStudents(freshStudents);
      setEvents(freshEvents);
      setApplications(freshApplications);
      const resolved = await resolveSessionUser(session, freshStudents, freshTeachers);
      if (!cancelled) setUser(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleScopedLogin = useCallback(
    async (email: string, password: string, allow: readonly PortalUser['role'][]): Promise<LoginOutcome> => {
      const result = await signIn(email, password);
      if (!result.ok) return result;

      const { data } = await supabase.auth.getSession();
      const freshSession = data.session;
      if (!freshSession) return { ok: false, message: 'Sign-in failed unexpectedly.' };

      const [freshStudents, freshTeachers] = await Promise.all([
        fetchStudents().catch(() => []),
        fetchTeachers().catch(() => []),
      ]);
      const resolved = await resolveSessionUser(freshSession, freshStudents, freshTeachers);

      if (!allow.includes(resolved.role)) {
        await signOut();
        return { ok: false, message: 'This login is not valid for this portal.' };
      }

      // The onAuthStateChange listener above will pick up freshSession and
      // drive students/teachers/events/user state from here.
      return { ok: true };
    },
    [],
  );

  const handleParentLogin = useCallback(
    (email: string, password: string) => handleScopedLogin(email, password, ['parent', 'pending_parent']),
    [handleScopedLogin],
  );
  const handleStaffLogin = useCallback(
    (email: string, password: string) => handleScopedLogin(email, password, ['admin', 'teacher']),
    [handleScopedLogin],
  );

  const handleParentSignUp = useCallback(
    async (email: string, password: string): Promise<SignUpOutcome> => signUp(email, password),
    [],
  );

  const handlePortalLogout = useCallback(async () => {
    await signOut();
  }, []);

  const handleReauthenticate = useCallback(
    async (password: string): Promise<boolean> => {
      if (!user.email) return false;
      const result = await signIn(user.email, password);
      return result.ok;
    },
    [user.email],
  );

  // Student mutations — each patches local state directly from the server's
  // response so the UI reflects exactly what was persisted, not an optimistic guess.
  const handleAddNewStudent = useCallback(async (input: NewStudentInput): Promise<StudentProfile> => {
    const created = await createStudent(input);
    setStudents(prev => [...prev, created]);
    return created;
  }, []);

  const handleLinkParent = useCallback(async (studentId: string, email: string): Promise<void> => {
    await linkParentByEmail(studentId, email);
    // The RPC doesn't return the linked row, and only the linked family
    // gains visibility from it — a full refetch is the simplest correct way
    // to pick up the new parent_user_id.
    const fresh = await fetchStudents().catch(() => students);
    setStudents(fresh);
  }, [students]);

  const handleUpdateRemarks = useCallback(
    async (studentId: string, fields: { teacherRemarks: string; generalStatus: StudentProfile['generalStatus'] }) => {
      await updateStudentRemarks(studentId, fields);
      setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, ...fields } : s)));
    },
    [],
  );

  const handleAddGrade = useCallback(
    async (
      studentId: string,
      grade: { subject: string; score: number; teacher: string; term: GradeRecord['term'] },
    ): Promise<GradeRecord> => {
      const created = await addGrade(studentId, grade);
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, grades: [...s.grades, created] } : s)),
      );
      return created;
    },
    [],
  );

  const handleDeleteGrade = useCallback(async (gradeId: string): Promise<void> => {
    await deleteGrade(gradeId);
    setStudents(prev => prev.map(s => ({ ...s, grades: s.grades.filter(g => g.id !== gradeId) })));
  }, []);

  const handleDeleteStudent = useCallback(async (studentId: string): Promise<void> => {
    await deleteStudent(studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
  }, []);

  const handleUploadAvatar = useCallback(async (studentId: string, file: File): Promise<void> => {
    const signedUrl = await uploadStudentAvatar(studentId, file);
    setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, avatarUrl: signedUrl } : s)));
  }, []);

  // Events mutations
  const handleAddNewEvent = useCallback(async (newEvent: Omit<SchoolEvent, 'id'>): Promise<void> => {
    const created = await addEvent(newEvent);
    setEvents(prev => [...prev, created]);
  }, []);

  // Admissions
  const handleSubmitApplication = useCallback(
    async (input: {
      childName: string;
      dateOfBirth: string;
      gradeApplyingFor: string;
      parentName: string;
      parentPhone: string;
      notes: string;
    }): Promise<AdmissionApplication> => {
      const created = await submitApplication(input);
      setApplications(prev => [...prev, created]);
      return created;
    },
    [],
  );

  const handleApproveApplication = useCallback(
    async (input: {
      applicationId: string;
      studentCode: string;
      gradeLevel: string;
      classroom: string;
      rollNumber: number;
      house: StudentProfile['house'];
    }): Promise<string> => {
      const newStudentId = await approveApplication(input);
      // Approving both creates a student and (for the applicant) changes
      // their own resolvable role — refetch everything rather than patch
      // three different pieces of state by hand.
      const [freshStudents, freshApplications] = await Promise.all([
        fetchStudents().catch(() => students),
        fetchApplications().catch(() => applications),
      ]);
      setStudents(freshStudents);
      setApplications(freshApplications);
      return newStudentId;
    },
    [students, applications],
  );

  const handleRejectApplication = useCallback(async (applicationId: string): Promise<void> => {
    await rejectApplication(applicationId);
    setApplications(prev =>
      prev.map(a => (a.id === applicationId ? { ...a, status: 'rejected' } : a)),
    );
  }, []);

  return (
    <div id="school-portal-viewport" className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">

      <HeaderNav user={user} onLogout={handlePortalLogout} />
      <ScrollToHash />

      {/* Main Content Area framed with spacious responsive padding and fluid boundaries */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="w-full"
          >
            <Routes location={location}>
              <Route path="/" element={<HomeSection />} />
              <Route path="/about" element={<AboutSection />} />
              <Route path="/academics" element={<AcademicsSection />} />
              <Route path="/beyond-academics" element={<BeyondAcademicsSection />} />
              <Route path="/nursery-primary" element={<NurseryPrimarySection />} />
              <Route path="/news-events" element={<NewsEventsSection events={events} />} />
              <Route path="/campus-life" element={<CampusLifeSection />} />
              <Route path="/admissions" element={<AdmissionsSection />} />
              <Route path="/alumni" element={<AlumniSection />} />

              <Route
                path="/calendar"
                element={<CalendarSection events={events} onAddEvent={handleAddNewEvent} user={user} />}
              />
              <Route
                path="/parent-portal"
                element={
                  <ParentPortal
                    students={students}
                    user={user}
                    onLogin={handleParentLogin}
                    onSignUp={handleParentSignUp}
                    onLogout={handlePortalLogout}
                    ownApplication={applications.length > 0 ? applications[applications.length - 1] : null}
                    onSubmitApplication={handleSubmitApplication}
                    onUploadAvatar={handleUploadAvatar}
                  />
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminPortal
                    students={students}
                    user={user}
                    onLogin={handleStaffLogin}
                    onLogout={handlePortalLogout}
                    onReauthenticate={handleReauthenticate}
                    onAddStudent={handleAddNewStudent}
                    onLinkParent={handleLinkParent}
                    onUpdateRemarks={handleUpdateRemarks}
                    onAddGrade={handleAddGrade}
                    onDeleteGrade={handleDeleteGrade}
                    onDeleteStudent={handleDeleteStudent}
                    applications={applications}
                    onApproveApplication={handleApproveApplication}
                    onRejectApplication={handleRejectApplication}
                  />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />

    </div>
  );
}
