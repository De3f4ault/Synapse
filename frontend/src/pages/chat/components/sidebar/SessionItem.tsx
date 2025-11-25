/**
 * SessionItem - Minimal session card
 * Shows title, timestamp, and message count
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ChatSessionResponse } from '@/api/generated/types.gen';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSessionApiV1ChatSessionsSessionIdDelete } from '@/api/generated/services.gen';
import { toast } from 'sonner';

interface SessionItemProps {
  session: ChatSessionResponse;
}

export const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const isActive = sessionId === String(session.id);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteSessionApiV1ChatSessionsSessionIdDelete({ sessionId: session.id }),
                                     onSuccess: () => {
                                       queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
                                       toast.success('Session deleted');
                                       if (isActive) {
                                         navigate('/chat');
                                       }
                                     },
                                     onError: () => {
                                       toast.error('Failed to delete session');
                                     },
  });

  const handleClick = () => {
    navigate(`/chat/${session.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <motion.button
    onClick={handleClick}
    whileHover={{ x: 2 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'group relative w-full text-left',
      'px-3 py-2.5 rounded-lg',
      'transition-all duration-200',
      'flex items-start gap-2',
      isActive
      ? 'bg-primary/20 text-white border border-primary/30'
      : 'text-white/70 hover:bg-medium/50 hover:text-white border border-transparent'
    )}
    >
    {/* Icon */}
    <MessageSquare
    className={cn(
      'w-4 h-4 mt-0.5 flex-shrink-0',
      isActive ? 'text-primary' : 'text-white/40 group-hover:text-white/60'
    )}
    />

    {/* Content */}
    <div className="flex-1 min-w-0">
    {/* Title */}
    <p
    className={cn(
      'text-sm font-medium truncate',
      isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
    )}
    >
    {session.title || 'New Chat'}
    </p>

    {/* Metadata */}
    <div className="flex items-center gap-2 mt-0.5">
    <span className="text-xs text-white/40">
    {formatRelativeTime(session.updated_at)}
    </span>
    {session.message_count > 0 && (
      <>
      <span className="text-white/20">•</span>
      <span className="text-xs text-white/40">
      {session.message_count} msg{session.message_count !== 1 ? 's' : ''}
      </span>
      </>
    )}
    </div>
    </div>

    {/* Delete Button */}
    <button
    onClick={handleDelete}
    disabled={deleteMutation.isPending}
    className={cn(
      'absolute right-2 top-1/2 -translate-y-1/2',
      'opacity-0 group-hover:opacity-100',
      'p-1 rounded hover:bg-red-500/20',
      'transition-opacity duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )}
    aria-label="Delete session"
    >
    <Trash2 className="w-3.5 h-3.5 text-red-400" />
    </button>
    </motion.button>
  );
};

export default SessionItem;
