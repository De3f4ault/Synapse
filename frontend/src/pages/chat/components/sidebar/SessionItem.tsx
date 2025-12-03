/**
 * SessionItem - Oracle Theme
 * Individual session item with click handler and active state
 *
 * Location: frontend/src/pages/chat/components/sidebar/SessionItem.tsx
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatSessionResponse } from '@/api/generated/types.gen';
import { useDeleteSession } from '../../hooks/useChatSession';

interface SessionItemProps {
  session: ChatSessionResponse;
}

export const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const deleteSession = useDeleteSession();

  const isActive = sessionId === String(session.id);

  const handleClick = () => {
    navigate(`/chat/${session.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${session.title}"?`)) {
      deleteSession.mutate(session.id);
    }
  };

  return (
    <div
    onClick={handleClick}
    className={cn(
      'group relative w-full px-3 py-2.5 rounded-lg transition-all cursor-pointer',
      'flex items-center gap-3',
      isActive
      ? 'bg-cyan-900/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
      : 'hover:bg-white/5 border border-transparent hover:border-white/10'
    )}
    >
    {/* Active Indicator */}
    <div
    className={cn(
      'w-1 h-1 rounded-full transition-all',
      isActive
      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
      : 'bg-slate-700 group-hover:bg-cyan-400/50'
    )}
    />

    {/* Icon */}
    <MessageSquare
    size={14}
    className={cn(
      'flex-shrink-0 transition-colors',
      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
    )}
    />

    {/* Title */}
    <span
    className={cn(
      'flex-1 text-sm font-serif truncate transition-colors',
      isActive
      ? 'text-cyan-100 font-medium'
      : 'text-slate-400 group-hover:text-slate-200'
    )}
    >
    {session.title}
    </span>

    {/* Message Count Badge */}
    {session.message_count > 0 && (
      <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors',
        isActive
        ? 'bg-cyan-500/20 text-cyan-300'
        : 'bg-white/5 text-slate-500 group-hover:bg-white/10'
      )}
      >
      {session.message_count}
      </span>
    )}

    {/* Delete Button (Appears on Hover) */}
    <button
    onClick={handleDelete}
    className={cn(
      'opacity-0 group-hover:opacity-100 transition-opacity',
      'p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400',
      isActive && 'opacity-100'
    )}
    title="Delete session"
    >
    <Trash2 size={12} />
    </button>

    {/* Glow effect for active session */}
    {isActive && (
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none" />
    )}
    </div>
  );
};

export default SessionItem;
