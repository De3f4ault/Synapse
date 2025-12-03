/**
 * SessionList - Oracle Theme
 * Groups sessions into "Visions" based on time.
 *
 * Location: frontend/src/pages/chat/components/sidebar/SessionList.tsx
 */

import React from 'react';
import type { ChatSessionResponse } from '@/api/generated/types.gen';
import { SessionItem } from './SessionItem';
import { groupSessionsByDate } from '../../utils/dateGrouper';
import { MessageSquare, Loader2 } from 'lucide-react';

interface SessionListProps {
  sessions: ChatSessionResponse[];
  isLoading?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-3 text-cyan-500/50">
      <Loader2 className="w-5 h-5 animate-spin" />
      <p className="text-[10px] font-mono tracking-widest uppercase">Consulting Archives...</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 opacity-50">
      <MessageSquare className="w-8 h-8 text-slate-600" />
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">
      No visions recorded
      </p>
      <p className="text-[9px] font-mono text-slate-600 text-center mt-1">
      Begin your journey with a new invocation
      </p>
      </div>
    );
  }

  // Group sessions by date (Today, Yesterday, This Week, etc.)
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="space-y-6 pb-4">
    {Object.entries(groupedSessions).map(([groupLabel, groupSessions]) => (
      <div key={groupLabel} className="space-y-2">
      {/* Group Header */}
      <div className="px-3 mb-2">
      <h3 className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] pl-1">
      {groupLabel}
      </h3>
      </div>

      {/* Sessions in this group */}
      <div className="space-y-1">
      {groupSessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
      </div>
      </div>
    ))}
    </div>
  );
};

export default SessionList;
