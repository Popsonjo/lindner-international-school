import React, { useMemo, useState } from 'react';
import { X, Users, UserPlus, Search, AlertTriangle, Pencil, GraduationCap } from 'lucide-react';
import { StudentProfile, TeacherProfile } from '../types';
import { NewTeacherInput } from '../lib/api';

interface TeacherManagementProps {
  students: StudentProfile[];
  teachers: TeacherProfile[];
  onClose: () => void;
  onCreateTeacher: (input: NewTeacherInput) => Promise<TeacherProfile>;
  onUpdateTeacherAssignment: (
    teacherId: string,
    input: { level: 'primary' | 'secondary'; classroom?: string; subject?: string; studentIds?: string[] },
  ) => Promise<void>;
}

type ViewMode = 'list' | 'create' | { edit: string };

export default function TeacherManagement({
  students, teachers, onClose, onCreateTeacher, onUpdateTeacherAssignment,
}: TeacherManagementProps) {
  const [view, setView] = useState<ViewMode>('list');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Create-only fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Shared create/edit fields
  const [level, setLevel] = useState<'primary' | 'secondary'>('primary');
  const [classroom, setClassroom] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');

  const classroomOptions = useMemo(
    () => [...new Set(students.map((s) => s.classroom))].sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setLevel('primary');
    setClassroom(classroomOptions[0] ?? '');
    setSubject('');
    setSelectedStudentIds(new Set());
    setStudentSearch('');
    setError('');
  };

  const startCreate = () => {
    resetForm();
    setView('create');
  };

  const startEdit = (teacher: TeacherProfile) => {
    setFullName(teacher.name);
    setEmail('');
    setPassword('');
    setLevel(teacher.teachingLevel ?? 'primary');
    setClassroom(teacher.teachingClass ?? classroomOptions[0] ?? '');
    setSubject(teacher.teachingSubject ?? '');
    setSelectedStudentIds(new Set(teacher.assignedStudentIds));
    setStudentSearch('');
    setError('');
    setView({ edit: teacher.id });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Full name, email, and a password of at least 6 characters are all required.');
      return;
    }
    if (level === 'primary' && !classroom) {
      setError('Choose a classroom for this primary teacher.');
      return;
    }
    if (level === 'secondary' && !subject.trim()) {
      setError('Enter a subject for this secondary teacher.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onCreateTeacher({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        level,
        classroom: level === 'primary' ? classroom : undefined,
        subject: level === 'secondary' ? subject.trim() : undefined,
        studentIds: level === 'secondary' ? [...selectedStudentIds] : undefined,
      });
      setView('list');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that teacher account.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent, teacherId: string) => {
    e.preventDefault();
    if (level === 'primary' && !classroom) {
      setError('Choose a classroom for this primary teacher.');
      return;
    }
    if (level === 'secondary' && !subject.trim()) {
      setError('Enter a subject for this secondary teacher.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onUpdateTeacherAssignment(teacherId, {
        level,
        classroom: level === 'primary' ? classroom : undefined,
        subject: level === 'secondary' ? subject.trim() : undefined,
        studentIds: level === 'secondary' ? [...selectedStudentIds] : undefined,
      });
      setView('list');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that assignment.');
    } finally {
      setBusy(false);
    }
  };

  const editingTeacher =
    typeof view === 'object' ? teachers.find((t) => t.id === view.edit) ?? null : null;

  const renderAssignmentFields = () => (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLevel('primary')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
            level === 'primary' ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          Primary — assign a class
        </button>
        <button
          type="button"
          onClick={() => setLevel('secondary')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
            level === 'secondary' ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          Secondary — assign a subject
        </button>
      </div>

      {level === 'primary' ? (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Classroom</label>
          {classroomOptions.length > 0 ? (
            <select
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none"
            >
              {classroomOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-slate-400 italic">No classrooms found — admit a student first.</p>
          )}
          <p className="text-[10px] text-slate-400">
            Every student currently in this classroom will be visible to this teacher.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Chemistry"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
              Students who take this subject ({selectedStudentIds.size} selected)
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredStudents.length === 0 && (
                <p className="text-xs text-slate-400 italic p-3">No students match.</p>
              )}
              {filteredStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="accent-navy-700"
                  />
                  <span className="font-medium text-slate-700">{s.name}</span>
                  <span className="text-slate-400 font-mono">{s.studentId}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Teacher Management">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
        <div className="bg-[#16305F] text-white p-5 flex items-center justify-between shrink-0">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gold-400" />
            <span>
              {view === 'list' ? 'Teacher Management' : view === 'create' ? 'Add Teacher' : `Edit Assignment — ${editingTeacher?.name ?? ''}`}
            </span>
          </h3>
          <button onClick={onClose} aria-label="Close teacher management" className="text-gold-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {view === 'list' && (
            <>
              <button
                type="button"
                onClick={startCreate}
                className="w-full py-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Teacher</span>
              </button>

              {teachers.length === 0 ? (
                <p className="text-sm text-slate-400 font-light italic text-center py-8">No teachers yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {teachers.map((t) => (
                    <div key={t.id} className="border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{t.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                            t.teachingLevel === 'primary' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {t.teachingLevel ?? 'unassigned'}
                          </span>
                          <span>{t.teachingLevel === 'primary' ? t.teachingClass : t.teachingSubject}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.assignedStudentIds.length} students</span>
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(t)}
                        className="px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Dr. Evelyn Foster" className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@lindner.edu" className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none" />
                </div>
              </div>

              {renderAssignmentFields()}

              <p className="text-[10px] text-slate-400 leading-snug">
                The teacher will receive a confirmation email (Supabase's "Enable email confirmations" must stay on) —
                they'll need to confirm it before signing in with the password above.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs">Cancel</button>
                <button type="submit" disabled={busy} className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-lg text-xs font-semibold disabled:opacity-60">
                  {busy ? 'Creating…' : 'Create Teacher'}
                </button>
              </div>
            </form>
          )}

          {typeof view === 'object' && editingTeacher && (
            <form onSubmit={(e) => handleEditSubmit(e, editingTeacher.id)} className="space-y-4">
              {error && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {renderAssignmentFields()}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs">Cancel</button>
                <button type="submit" disabled={busy} className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-lg text-xs font-semibold disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
