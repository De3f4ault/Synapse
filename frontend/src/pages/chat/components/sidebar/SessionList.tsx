/**
 * SessionList - Time-grouped chat sessions
 * Groups: Today, Yesterday, Last 7 Days, Last 30 Days, Older
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSessionsApiV1ChatSessionsGet } from '@/api/generated/services.gen';
import type { ChatSessionResponse } from '@/api/generated/types.gen';
import { SessionItem } from './SessionItem';
import { groupSessionsByDate } from '../../utils/dateGrouper';
import { Loader2, MessageSquare } from 'lucide-react';

export const SessionList: React.FC = () => {
  // Fetch sessions
  const { data, isLoading, error } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => listSessionsApiV1ChatSessionsGet({ page: 1, pageSize: 100 }),
                                              refetchOnWindowFocus: false,
                                              staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Extract actual session list
  const sessions: ChatSessionResponse[] = data?.items ?? [];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
      <p className="text-xs text-white/40">Loading sessions...</p>
      </div>
    );
  }

  // Error state (handles 401 too)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
      <MessageSquare className="w-5 h-5 text-red-400" />
      <p className="text-xs text-red-400 text-center">Failed to load sessions</p>
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
      <MessageSquare className="w-8 h-8 text-white/20" />
      <p className="text-xs text-white/40 text-center">
      No conversations yet
      </p>
      <p className="text-xs text-white/30 text-center">
      Start a new chat to begin
      </p>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="py-2">
    {Object.entries(groupedSessions).map(([group, groupSessions]) => (
      <div key={group} className="mb-4">
      {/* Group Header */}
      <div className="px-3 py-2">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
      {group}
      </h3>
      </div>

      {/* Sessions in Group */}
      <div className="space-y-1 px-2">
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
