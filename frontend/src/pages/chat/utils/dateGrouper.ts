/**
 * dateGrouper - Group sessions by time
 * Groups chat sessions into: Today, Yesterday, Last 7 Days, Last 30 Days, Older
 */

import type { ChatSessionResponse } from '@/api/generated/types.gen';

export type DateGroup = 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'Older';

export interface GroupedSessions {
  [key: string]: ChatSessionResponse[];
}

/**
 * Check if date is today
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is yesterday
 */
const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Check if date is within last N days
 */
const isWithinDays = (date: Date, days: number): boolean => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
};

/**
 * Determine which group a session belongs to
 */
const getDateGroup = (updatedAt: string): DateGroup => {
  const date = new Date(updatedAt);

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isWithinDays(date, 7)) return 'Last 7 Days';
  if (isWithinDays(date, 30)) return 'Last 30 Days';
  return 'Older';
};

/**
 * Group sessions by date
 */
export const groupSessionsByDate = (
  sessions: ChatSessionResponse[]
): GroupedSessions => {
  const grouped: GroupedSessions = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    Older: [],
  };

  // Sort sessions by updated_at (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Group sessions
  for (const session of sortedSessions) {
    const group = getDateGroup(session.updated_at);
    grouped[group].push(session);
  }

  // Remove empty groups
  const result: GroupedSessions = {};
  for (const [group, groupSessions] of Object.entries(grouped)) {
    if (groupSessions.length > 0) {
      result[group] = groupSessions;
    }
  }

  return result;
};

/**
 * Get relative time string for a date
 */
export const getRelativeTimeString = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};
