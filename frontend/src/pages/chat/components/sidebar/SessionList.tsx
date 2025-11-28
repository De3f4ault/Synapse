/**
 * SessionList - Oracle Theme
 * Groups sessions into "Visions" based on time.
 *
 * Location: chat/components/sidebar/SessionList.tsx
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

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 opacity-50">
      <MessageSquare className="w-8 h-8 text-slate-600" />
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">
      No visions recorded
      </p>
      </div>
    );
  }

  // Use your existing grouping utility
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="pb-4">
    {Object.entries(groupedSessions).map(([group, groupSessions]) => (
      <div key={group} className="mb-6 last:mb-0">
      <div className="px-3 mb-2">
      <h3 className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] pl-1">
      {group}
      </h3>
      </div>
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
