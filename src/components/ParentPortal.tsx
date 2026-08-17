import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Key, Award, AlertTriangle, CheckCircle2, FileText, Camera,
  UserCheck, MessageSquare, BookOpen, Send, Download, Sparkles
} from 'lucide-react';
import { AdmissionApplication, StudentProfile, PortalUser } from '../types';
import { HOUSES } from '../data/mockData';
import { LoginOutcome, SignUpOutcome } from '../lib/auth';
import { MAX_SCORE, MIN_SCORE, averageScore, currentAcademicSession, letterForScore } from '../lib/grading';

interface ParentPortalProps {
  students: StudentProfile[];
  user: PortalUser;
  /** Scoped to parent accounts only — staff logins are rejected here. */
  onLogin: (email: string, password: string) => Promise<LoginOutcome>;
  onSignUp: (email: string, password: string) => Promise<SignUpOutcome>;
  onLogout: () => void;
  /** Most recent application from this signed-in parent, if any. */
  ownApplication: AdmissionApplication | null;
  onSubmitApplication: (
    input: {
      childName: string;
      dateOfBirth: string;
      gradeApplyingFor: string;
      parentName: string;
      parentPhone: string;
      notes: string;
    },
    photoFile?: File | null,
  ) => Promise<AdmissionApplication>;
  onUploadAvatar: (studentId: string, file: File) => Promise<void>;
}

const STANDING_STYLES: Record<StudentProfile['generalStatus'], { badge: string; label: string }> = {
  Excellent: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Consistent Performer' },
  Good: { badge: 'bg-sky-50 text-sky-800 border-sky-100', label: 'On Track' },
  'Needs Improvement': { badge: 'bg-amber-50 text-amber-800 border-amber-100', label: 'Under Review' },
  Critical: { badge: 'bg-rose-50 text-rose-800 border-rose-100', label: 'Immediate Attention' },
};

export default function ParentPortal({
  students, user, onLogin, onSignUp, onLogout, ownApplication, onSubmitApplication, onUploadAvatar,
}: ParentPortalProps) {
  const [searchParams] = useSearchParams();
  // "Apply Now" on the homepage links here with ?signup=1 so prospective
  // families land straight on the account-creation tab instead of Sign In.
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(
    searchParams.get('signup') ? 'signup' : 'signin',
  );
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [signupNotice, setSignupNotice] = useState('');
  const linkCheckTimer = useRef<number | null>(null);

  // Admission application form state
  const [appChildName, setAppChildName] = useState('');
  const [appDob, setAppDob] = useState('');
  const [appGrade, setAppGrade] = useState('Grade 9 - Foundation Year');
  const [appParentName, setAppParentName] = useState('');
  const [appParentPhone, setAppParentPhone] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [appPhoto, setAppPhoto] = useState<File | null>(null);
  const [appPhotoPreview, setAppPhotoPreview] = useState('');
  const [appError, setAppError] = useState('');
  const [appBusy, setAppBusy] = useState(false);
  const [appSubmitted, setAppSubmitted] = useState(false);

  // Message simulator states
  const [chatMessage, setChatMessage] = useState('');
  const [chatLogs, setChatLogs] = useState<{ sender: 'parent' | 'teacher'; text: string; time: string }[]>([
    { sender: 'teacher', text: 'Greeting! I am glad to share your child’s progress. Should you have any questions on the term exam schedules, please feel free to send me a message here.', time: 'Yesterday, 04:30 PM' }
  ]);

  // Pending simulated replies, cleared on unmount so a logout mid-conversation
  // cannot fire a state update against a torn-down component.
  const replyTimers = useRef<number[]>([]);
  useEffect(
    () => () => {
      replyTimers.current.forEach(window.clearTimeout);
      replyTimers.current = [];
    },
    [],
  );

  const activeStudent = students.find(s => s.studentId === user.studentId);

  // Once the parent link resolves (handled server-side by the signup trigger
  // matching this email to a student's parent_email), the dashboard below
  // takes over — clear any "we're linking your account" messaging.
  useEffect(() => {
    if (user.role === 'parent') {
      if (linkCheckTimer.current !== null) {
        window.clearTimeout(linkCheckTimer.current);
        linkCheckTimer.current = null;
      }
      setSignupNotice('');
    }
  }, [user.role]);

  useEffect(
    () => () => {
      if (linkCheckTimer.current !== null) window.clearTimeout(linkCheckTimer.current);
    },
    [],
  );

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    const result = await onLogin(loginEmail, loginPassword);
    setLoginBusy(false);
    if (result.ok) {
      setErrorMsg('');
      setLoginPassword('');
      return;
    }
    setErrorMsg(result.message);
    setLoginPassword('');
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setErrorMsg('');
    setSignupNotice('');
    const result = await onSignUp(loginEmail, loginPassword);
    setLoginBusy(false);

    if (!result.ok) {
      setErrorMsg(result.message);
      return;
    }
    setLoginPassword('');

    if (result.needsEmailConfirmation) {
      setSignupNotice('Account created! Check your email to confirm it, then sign in below.');
      setAuthMode('signin');
      return;
    }

    // No email confirmation required — a session exists already, and the
    // app's auth-state listener is fetching/resolving the linked student
    // right now. Give it a moment before assuming the email didn't match one.
    setSignupNotice("Account created — linking it to your child's record…");
    if (linkCheckTimer.current !== null) window.clearTimeout(linkCheckTimer.current);
    linkCheckTimer.current = window.setTimeout(() => {
      setSignupNotice(
        "We couldn't find a student record matching this email yet. If this doesn't update shortly, please contact the school office to link your account.",
      );
    }, 3000);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    const childName = appChildName.trim();
    const parentName = appParentName.trim();
    const parentPhone = appParentPhone.trim();
    if (!childName || !parentName || !parentPhone) {
      setAppError('Child name, parent name, and a phone number are all required.');
      return;
    }
    setAppBusy(true);
    setAppError('');
    try {
      await onSubmitApplication(
        {
          childName,
          dateOfBirth: appDob,
          gradeApplyingFor: appGrade,
          parentName,
          parentPhone,
          notes: appNotes.trim(),
        },
        appPhoto,
      );
      setAppSubmitted(true);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Could not submit the application.');
    } finally {
      setAppBusy(false);
    }
  };

  const handleAppPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAppPhoto(file);
    setAppPhotoPreview(file ? URL.createObjectURL(file) : '');
  };

  // Revokes the previous preview URL whenever it changes, and on unmount.
  useEffect(() => () => { if (appPhotoPreview) URL.revokeObjectURL(appPhotoPreview); }, [appPhotoPreview]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const outgoing = chatMessage.trim();
    if (!outgoing) return;

    setChatLogs(prev => [...prev, { sender: 'parent' as const, text: outgoing, time: 'Just now' }]);
    setChatMessage('');

    // Simulate smart teacher reply after 1.5 seconds
    const timer = window.setTimeout(() => {
      setChatLogs(prev => [
        ...prev,
        {
          sender: 'teacher',
          text: `Thank you for your inquiry regarding ${activeStudent?.name || 'your child'}. I have received your message and will review their latest academic logs. Let us discuss this further in detail during our next progress review this Monday!`,
          time: 'Just now'
        }
      ]);
      replyTimers.current = replyTimers.current.filter(id => id !== timer);
    }, 1500);
    replyTimers.current.push(timer);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file || !activeStudent) return;

    setAvatarBusy(true);
    setAvatarError('');
    try {
      await onUploadAvatar(activeStudent.id, file);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not upload that photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // Signed in, but not yet linked to a student — either applying for
  // admission for the first time, or waiting on a submitted application.
  if (user.role === 'pending_parent') {
    const showForm = !ownApplication || ownApplication.status === 'rejected';

    return (
      <div id="parent-portal-application" className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="bg-navy-700 text-white p-8 text-center space-y-2">
            <div className="bg-navy-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-gold-400/30">
              <FileText className="w-8 h-8 text-gold-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">
              {showForm ? 'Apply for Admission' : 'Application Status'}
            </h2>
            <p className="text-xs text-[#EAF5F2] font-light max-w-xs mx-auto">
              {showForm
                ? "Your account isn't linked to an enrolled student yet — tell us about your child and our admissions office will review it."
                : "We're reviewing your submission — you'll be notified once there's an update."}
            </p>
          </div>

          {showForm ? (
            appSubmitted ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm text-slate-700 font-medium">Application submitted!</p>
                <p className="text-xs text-slate-500">
                  The admissions office will review it and follow up by email or phone.
                </p>
                <button
                  onClick={onLogout}
                  className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="p-8 space-y-4">
                {appError && (
                  <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{appError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="app-child-name" className="text-xs font-bold text-slate-700 block">Child's Full Name</label>
                    <input
                      id="app-child-name"
                      type="text"
                      required
                      value={appChildName}
                      onChange={(e) => setAppChildName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="app-dob" className="text-xs font-bold text-slate-700 block">Date of Birth</label>
                    <input
                      id="app-dob"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={appDob}
                      onChange={(e) => setAppDob(e.target.value)}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="app-grade" className="text-xs font-bold text-slate-700 block">Applying For</label>
                    <select
                      id="app-grade"
                      value={appGrade}
                      onChange={(e) => setAppGrade(e.target.value)}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none"
                    >
                      <option value="Nursery">Nursery</option>
                      <option value="Grade 9 - Foundation Year">Grade 9 - Foundation</option>
                      <option value="Grade 10 - Honors Track">Grade 10 - Honors</option>
                      <option value="Grade 11 - IB Science Track">Grade 11 - IB Sciences</option>
                      <option value="Grade 12 - Liberal Arts Track">Grade 12 - Liberal Arts</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="app-parent-name" className="text-xs font-bold text-slate-700 block">Your Full Name</label>
                    <input
                      id="app-parent-name"
                      type="text"
                      required
                      value={appParentName}
                      onChange={(e) => setAppParentName(e.target.value)}
                      placeholder="e.g. Julianne Vance"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-700"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="app-parent-phone" className="text-xs font-bold text-slate-700 block">Phone Number</label>
                    <input
                      id="app-parent-phone"
                      type="tel"
                      required
                      value={appParentPhone}
                      onChange={(e) => setAppParentPhone(e.target.value)}
                      placeholder="e.g. +234 703 798 8653"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-700"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="app-notes" className="text-xs font-bold text-slate-700 block">Anything else we should know? (optional)</label>
                    <textarea
                      id="app-notes"
                      rows={3}
                      value={appNotes}
                      onChange={(e) => setAppNotes(e.target.value)}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-700"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="app-photo" className="text-xs font-bold text-slate-700 block">Child's Photo (optional)</label>
                    <div className="flex items-center gap-3">
                      {appPhotoPreview && (
                        <img
                          src={appPhotoPreview}
                          alt="Selected preview"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <input
                        id="app-photo"
                        type="file"
                        accept="image/*"
                        onChange={handleAppPhotoChange}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Can also be added later once your child is enrolled. Max 5MB.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={appBusy}
                  className="w-full py-3.5 bg-navy-700 hover:bg-navy-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  {appBusy ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            )
          ) : (
            <div className="p-8 text-center space-y-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                ownApplication?.status === 'under_review'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-100 text-sky-800'
              }`}>
                {ownApplication?.status === 'under_review' ? 'Under Review' : 'Submitted'}
              </span>
              <p className="text-sm text-slate-700">
                Application for <strong>{ownApplication?.childName}</strong> ({ownApplication?.gradeApplyingFor})
              </p>
              <p className="text-xs text-slate-500">
                Submitted {ownApplication ? new Date(ownApplication.submittedAt).toLocaleDateString() : ''}
              </p>
              <button
                onClick={onLogout}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If user is not logged in as Parent, render login form
  if (user.role !== 'parent' || !activeStudent) {
    return (
      <div id="parent-portal-login" className="max-w-md mx-auto py-12 px-4 shadow-sm">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="bg-navy-700 text-white p-8 text-center space-y-2">
            <div className="bg-navy-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-gold-400/30">
              <Key className="w-8 h-8 text-gold-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">Parent Portal</h2>
            <p className="text-xs text-[#EAF5F2] font-light max-w-xs mx-auto">
              {authMode === 'signin'
                ? 'Sign in with your parent account to access your child’s academic transcript.'
                : 'Create your parent account using the same email the school has on file for you.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                authMode === 'signin' ? 'text-navy-700 border-b-2 border-navy-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                authMode === 'signup' ? 'text-navy-700 border-b-2 border-navy-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={authMode === 'signin' ? handleLoginSubmit : handleSignUpSubmit} className="p-8 space-y-4">
            {errorMsg && (
              <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {signupNotice && (
              <div role="status" className="bg-sky-50 border border-sky-100 text-sky-900 p-3.5 rounded-xl text-xs">
                {signupNotice}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="parent-email" className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-sans">
                Email
              </label>
              <input
                id="parent-email"
                type="email"
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-700 focus:bg-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="parent-password" className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-sans">
                Password
              </label>
              <input
                id="parent-password"
                type="password"
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={authMode === 'signin' ? 'Enter your password' : 'Choose a password (min. 6 characters)'}
                className="w-full text-sm pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-700 focus:bg-white placeholder:text-slate-400"
              />
              <span className="text-[10px] text-slate-400 block font-light leading-snug">
                {authMode === 'signin'
                  ? "Don't have an account yet? Use “Create Account” above."
                  : 'Pick your own password — don’t reuse one from another site.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-3.5 bg-navy-700 hover:bg-navy-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-[1px] disabled:opacity-60"
            >
              {loginBusy
                ? (authMode === 'signin' ? 'Signing In…' : 'Creating Account…')
                : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Retrieve styled house values
  const houseConfig = HOUSES[activeStudent.house] || { color: 'from-slate-600 to-slate-800 bg-slate-50 text-slate-900 border-slate-200' };

  // Calculate Average GPA/Score. Returns null for an empty transcript rather than
  // dividing by zero and rendering "NaN%".
  const average = averageScore(activeStudent.grades);
  const standing = STANDING_STYLES[activeStudent.generalStatus] ?? STANDING_STYLES.Good;

  return (
    <div id="parent-portal-dashboard" className="space-y-8">
      {/* Student Profile Card Header */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden print:border-none print:shadow-none">
        {/* Background Accent */}
        <div className={`absolute top-0 right-0 w-2 h-full bg-gradient-to-b ${houseConfig.color.split(' ')[0]}`}></div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0 print:hidden">
            <img
              src={activeStudent.avatarUrl}
              alt={activeStudent.name}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-2xl object-cover shadow-md border-4 border-slate-50"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              title="Upload a photo"
              aria-label="Upload a photo of your child"
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-navy-700 hover:bg-navy-600 text-white flex items-center justify-center shadow-md border-2 border-white disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          {/* Print-only static image — the upload button/overlay above is hidden when printing. */}
          <img
            src={activeStudent.avatarUrl}
            alt={activeStudent.name}
            referrerPolicy="no-referrer"
            className="hidden print:block w-24 h-24 rounded-2xl object-cover shadow-md border-4 border-slate-50 shrink-0"
          />
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-800">
                {activeStudent.name}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase bg-gradient-to-r ${houseConfig.color}`}>
                House {activeStudent.house}
              </span>
            </div>
            
            <p className="text-sm font-medium text-slate-500">
              {activeStudent.gradeLevel} • <span className="font-mono">{activeStudent.studentId}</span>
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-400 font-light mt-1">
              <span>Classroom: <strong className="font-medium text-slate-600">{activeStudent.classroom}</strong></span>
              <span>•</span>
              <span>Advisor: <strong className="font-medium text-slate-600">Mrs. Claire Beaumont</strong></span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold font-sans transition-colors flex items-center gap-1"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Print Report Card</span>
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/50 rounded-xl text-xs font-semibold transition-colors"
          >
            Secure Log Out
          </button>
        </div>
      </section>

      {avatarError && (
        <div role="alert" className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs flex items-start gap-2 print:hidden">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{avatarError}</span>
        </div>
      )}

      {/* Numerical Metrics Dashboard */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1: Average Score */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Average Percent</span>
            <span className="text-3xl font-serif font-bold text-slate-800 block">
              {average === null ? '—' : `${average}%`}
            </span>
            <span className="text-[10px] text-navy-600 font-medium block">
              {average === null
                ? 'No subject records on file yet'
                : `Term Grade equivalent: ${letterForScore(average)}`}
            </span>
          </div>
          <div className="bg-navy-50 text-navy-700 p-3 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Attendance Percentage */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Attendance Rate</span>
            <span className="text-3xl font-serif font-bold text-slate-800 block">
              {activeStudent.attendance.percentage}%
            </span>
            <span className="text-[10px] text-slate-400 block font-light">
              Present: {activeStudent.attendance.present}/{activeStudent.attendance.totalDays} Days
            </span>
          </div>
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Roll Number */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Class Registry Index</span>
            <span className="text-3xl font-serif font-bold text-navy-700 block">#{activeStudent.rollNumber}</span>
            <span className="text-[10px] text-slate-400 block font-light">Co-curricular points: Active</span>
          </div>
          <div className="bg-purple-50 text-purple-700 p-3 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: General Academic Standing Status */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1 col-span-1">
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Academic Standing</span>
            <span className="text-xl sm:text-2xl font-semibold text-slate-800 block mt-1">
              {activeStudent.generalStatus}
            </span>
            {/* Every standing gets its own treatment — "Good" and "Critical" used to
                share the same amber "Under Review" badge. */}
            <span className={`text-[9px] px-2 py-0.5 rounded-full inline-block mt-0.5 border ${standing.badge}`}>
              {standing.label}
            </span>
          </div>
          <div className="bg-gold-50 text-gold-600 p-3 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

      </section>

      {/* Grades Split Layout and Visual Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Grid: Grade Progress Bars (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-serif font-bold text-slate-800">
              Terminal Subject Transcript
            </h3>
            <span className="text-xs font-mono text-slate-400">{currentAcademicSession()} Session</span>
          </div>

          <div className="space-y-5">
            {activeStudent.grades.length === 0 && (
              <p className="text-xs text-slate-400 font-light italic">
                No subject records have been published for this term yet.
              </p>
            )}
            {activeStudent.grades.map((grade, idx) => (
              <div key={`${grade.subject}-${idx}`} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                      {grade.subject}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      Instructor: <span className="font-medium text-slate-500">{grade.teacher}</span>
                      {' · '}{grade.term}, {grade.session}
                    </p>
                  </div>
                  <div className="text-right flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-500">
                      Score: <strong className="text-slate-800 font-mono">{grade.score}/100</strong>
                    </span>
                    <span className="text-sm font-bold font-mono text-navy-700 bg-navy-50 border border-navy-100 px-2.5 py-0.5 rounded-lg">
                      {grade.grade}
                    </span>
                  </div>
                </div>

                {/* Progress bar representing subject score */}
                <div
                  className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative"
                  role="progressbar"
                  aria-valuenow={grade.score}
                  aria-valuemin={MIN_SCORE}
                  aria-valuemax={MAX_SCORE}
                  aria-label={`${grade.subject} score`}
                >
                  <div
                    // Navy-to-gold gradient echoes the crest's own two-tone identity.
                    className="h-full bg-gradient-to-r from-navy-700 to-gold-400 rounded-full transition-all duration-500"
                    // Clamped so an out-of-range score cannot overflow the track.
                    style={{ width: `${Math.min(MAX_SCORE, Math.max(MIN_SCORE, grade.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Extracurricular clubs */}
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
              Enrolled Extracurricular Clubs & Societies
            </h4>
            <div className="flex flex-wrap gap-2">
              {activeStudent.clubs.map((club, idx) => (
                <span key={idx} className="text-xs bg-slate-100/80 border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-xl font-medium">
                  {club}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Grid: Consultation Chat and TeacherRemarks (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Teacher Official Comment Case */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl shadow-inner space-y-3">
            <h3 className="text-xs font-bold text-navy-700 uppercase font-mono tracking-widest">
              Dean / Counselor Comments
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-serif tracking-wide italic">
              "{activeStudent.teacherRemarks}"
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <div className="w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center text-[10px] text-white font-bold font-mono">
                CB
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700 leading-none">Mrs. Claire Beaumont</p>
                <p className="text-[9px] text-slate-400 font-light leading-none mt-0.5">Primary Academic Director</p>
              </div>
            </div>
          </div>

          {/* Secure Messaging Simulator (Consult Advisor) */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-80">
            <div className="bg-navy-700/10 px-4 py-3 border-b border-slate-100 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-navy-700" />
              <h4 className="text-xs font-bold text-slate-700">Consult Class Advisor</h4>
              {/* Green pulse = universal "online now" convention, kept distinct from brand color */}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {chatLogs.map((log, idx) => (
                <div key={idx} className={`flex flex-col ${log.sender === 'parent' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    log.sender === 'parent'
                      ? 'bg-navy-700 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200/50'
                  }`}>
                    {log.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono font-light shrink-0">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-100 bg-slate-50 flex gap-1 items-center">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask teacher Beaumont a question..."
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white"
              />
              <button
                type="submit"
                className="p-2 bg-navy-700 hover:bg-navy-600 text-white rounded-xl transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      </section>

    </div>
  );
}
