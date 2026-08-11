import type { Session } from '@supabase/supabase-js';
import type { PortalUser, StudentProfile, TeacherProfile } from '../types';
import { supabase } from './supabaseClient';

/**
 * Auth is now Supabase's, not ours: credential storage, hashing, session
 * refresh, and login-attempt throttling all happen server-side. This module
 * is just a thin wrapper plus the logic to turn a Supabase session into the
 * app's PortalUser shape.
 */

export type LoginOutcome = { ok: true } | { ok: false; message: string };

export type SignUpOutcome =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

export async function signIn(email: string, password: string): Promise<LoginOutcome> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Please enter both your email and password.' };
  }
  const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Self-service parent sign-up. The account is auto-linked to a student by
 * the `handle_new_user` trigger (see supabase/schema.sql) if this email
 * matches a student's parent_email — that match is only trustworthy because
 * it requires owning the inbox (Supabase's email confirmation), not a
 * guessable public fact.
 */
export async function signUp(email: string, password: string): Promise<SignUpOutcome> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Please enter both your email and a password.' };
  }
  if (password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }
  const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, needsEmailConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

interface Profile {
  role: 'admin' | 'teacher' | 'parent';
  full_name: string;
}

async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

/**
 * Build the app's PortalUser from a live Supabase session plus the
 * already-fetched students/teachers lists. Those lists are already scoped by
 * Row Level Security to exactly what this user is allowed to see, so a
 * parent's list is already just their child and a teacher's list is already
 * just their assigned roster — no separate lookup needed.
 */
export async function resolveSessionUser(
  session: Session | null,
  students: readonly StudentProfile[],
  teachers: readonly TeacherProfile[],
): Promise<PortalUser> {
  if (!session) return { role: 'public' };

  const profile = await fetchOwnProfile(session.user.id);
  if (!profile) return { role: 'public' };

  const email = session.user.email;

  switch (profile.role) {
    case 'admin':
      return { role: 'admin', username: profile.full_name || 'Administrator', email };

    case 'teacher': {
      const self = teachers.find((t) => t.id === session.user.id);
      return {
        role: 'teacher',
        username: self?.name || profile.full_name || 'Teacher',
        email,
        teacherId: session.user.id,
        assignedStudentIds: students.map((s) => s.id),
      };
    }

    case 'parent': {
      const own = students.find((s) => s.parentUserId === session.user.id);
      if (!own) return { role: 'pending_parent', email };
      return { role: 'parent', studentId: own.studentId, studentName: own.name, email };
    }

    default:
      return { role: 'public' };
  }
}
