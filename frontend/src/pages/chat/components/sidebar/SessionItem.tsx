/**
 * SessionItem - Oracle Theme
 * Individual "Vision" entry in the Grimoire.
 *
 * Location: chat/components/sidebar/SessionItem.tsx
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // Delete mutation (Preserved)
  const deleteMutation = useMutation({
    mutationFn: () => deleteSessionApiV1ChatSessionsSessionIdDelete({ sessionId: session.id }),
                                     onSuccess: () => {
                                       queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
                                       toast.success('Vision erased from archives');
                                       if (isActive) navigate('/chat');
                                     },
                                     onError: () => toast.error('Failed to erase vision'),
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Using native confirm for now, as per original template
    if (confirm('Permanently erase this vision?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <motion.button
    onClick={() => navigate(`/chat/${session.id}`)}
    className={cn(
      'group relative w-full text-left',
      'px-3 py-2 rounded transition-all duration-200',
      'flex items-center gap-3',
      isActive
      ? 'bg-cyan-900/10 text-cyan-100' // Active State
      : 'text-slate-400 hover:text-cyan-100 hover:bg-cyan-900/5' // Inactive State
    )}
    >
    {/* Indicator Dot */}
    <div
    className={cn(
      "w-1 h-1 rounded-full transition-colors",
      isActive ? "bg-cyan-400 shadow-[0_0_8px_cyan]" : "bg-slate-700 group-hover:bg-cyan-400"
    )}
    />

    {/* Content */}
    <div className="flex-1 min-w-0">
    <p className={cn(
      "text-sm font-serif truncate transition-colors",
      isActive ? "text-cyan-100" : "text-slate-400 group-hover:text-cyan-200"
    )}>
    {session.title || 'Untitled Vision'}
    </p>
    </div>

    {/* Delete Button (Hover Only) */}
    <div
    role="button"
    tabIndex={0}
    onClick={handleDelete}
    className={cn(
      'opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/10 hover:text-red-400 text-slate-600',
      deleteMutation.isPending && 'opacity-50 cursor-not-allowed'
    )}
    >
    <Trash2 size={12} />
    </div>
    </motion.button>
  );
};

export default SessionItem;
