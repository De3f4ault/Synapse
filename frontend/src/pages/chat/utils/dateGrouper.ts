/**
 * Date Grouper Utility
 * Groups chat sessions by time periods (Today, Yesterday, This Week, etc.)
 *
 * Location: frontend/src/pages/chat/utils/dateGrouper.ts
 */

import type { ChatSessionResponse } from '@/api/generated/types.gen';

/**
 * Group sessions by date categories
 */
export function groupSessionsByDate(
  sessions: ChatSessionResponse[]
): Record<string, ChatSessionResponse[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const groups: Record<string, ChatSessionResponse[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': [],
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.updated_at || session.created_at);
    const sessionDay = new Date(
      sessionDate.getFullYear(),
                                sessionDate.getMonth(),
                                sessionDate.getDate()
    );

    if (sessionDay.getTime() === today.getTime()) {
      groups['Today'].push(session);
    } else if (sessionDay.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(session);
    } else if (sessionDate >= lastWeek) {
      groups['This Week'].push(session);
    } else if (sessionDate >= lastMonth) {
      groups['This Month'].push(session);
    } else {
      groups['Older'].push(session);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, sessions]) => sessions.length > 0)
  );
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Format absolute date (e.g., "Nov 6, 2024")
 */
export function formatAbsoluteDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time (e.g., "2:34 PM")
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
