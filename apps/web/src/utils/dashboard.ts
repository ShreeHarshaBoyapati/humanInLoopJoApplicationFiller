/**
 * Pure helpers used by the dashboard widgets.
 */

export function getDisplayName(email: string | null | undefined): string {
  if (!email) return 'there';
  const local = email.split('@')[0] ?? '';
  const firstSegment = local.split(/[._-]/)[0] ?? '';
  if (!firstSegment) return 'there';
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase();
}

export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export type ScoreLevel = 'high' | 'medium' | 'low';

export function scoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'high';
  if (score >= 65) return 'medium';
  return 'low';
}

export function scoreHexColor(score: number): string {
  if (score >= 80) return 'var(--green-400)';
  if (score >= 65) return 'var(--yellow-400)';
  return 'var(--red-600)';
}
