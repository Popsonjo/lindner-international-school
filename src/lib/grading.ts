import type { GradeRecord, StudentProfile } from '../types';

export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

export type GradeLetter = GradeRecord['grade'];

export const GRADE_LETTERS: readonly GradeLetter[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

/** Coerce any user/stored input into a usable 0-100 score. */
export function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return MIN_SCORE;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(n)));
}

/** Single source of truth for the score -> letter mapping. */
export function letterForScore(score: number): GradeLetter {
  const s = clampScore(score);
  if (s >= 95) return 'A+';
  if (s >= 90) return 'A';
  if (s >= 80) return 'B';
  if (s >= 70) return 'C';
  if (s >= 60) return 'D';
  return 'F';
}

/** Mean score across a transcript. Returns null for an empty transcript. */
export function averageScore(grades: readonly GradeRecord[]): number | null {
  if (!grades.length) return null;
  const total = grades.reduce((sum, g) => sum + clampScore(g.score), 0);
  return Math.round(total / grades.length);
}

/** Mean attendance across a cohort. Returns 0 for an empty cohort. */
export function averageAttendance(students: readonly StudentProfile[]): number {
  if (!students.length) return 0;
  const total = students.reduce((sum, s) => sum + (s.attendance?.percentage ?? 0), 0);
  return Math.round(total / students.length);
}
