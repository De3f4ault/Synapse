/**
 * MinimalSidebar - DeepSeek style collapsible sidebar
 * Slides in/out from left without unmounting
 *
 * Location: src/pages/chat/components/sidebar/MinimalSidebar.tsx
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { listSessionsApiV1ChatSessionsGet } from '@/api/generated/services.gen';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const MinimalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isCollapsed, toggleSidebar } = useSidebarCollapse();

  // Fetch chat sessions
  const { data: response } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => listSessionsApiV1ChatSessionsGet({ limit: 50 }),
                                      refetchOnWindowFocus: false,
  });

  // Ensure we always work with an array (API returns an object like { items: [] })
  const sessions = response?.items ?? [];

  // Group sessions by date
  const groupedSessions = React.useMemo(() => {
    if (!Array.isArray(sessions)) {
      return { today: [], yesterday: [], week: [], older: [] };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return sessions.reduce(
      (acc, session) => {
        // defensive: if created_at missing or invalid, treat as older
        const created = session?.created_at ? new Date(session.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) {
          acc.older.push(session);
          return acc;
        }

        if (created >= today) acc.today.push(session);
        else if (created >= yesterday) acc.yesterday.push(session);
        else if (created >= weekAgo) acc.week.push(session);
        else acc.older.push(session);
        return acc;
      },
      { today: [] as any[], yesterday: [] as any[], week: [] as any[], older: [] as any[] }
    );
  }, [sessions]);

  return (
    <AnimatePresence mode="wait">
    <motion.aside
    initial={{ x: -280 }}
    animate={{
      x: isCollapsed ? -280 : 0,
      transition: { type: 'spring', damping: 25, stiffness: 200 },
    }}
    exit={{ x: -280 }}
    className="fixed left-0 top-0 h-full w-[280px] bg-[#171717] border-r border-[#2F2F2F] z-40 flex flex-col"
    style={{ pointerEvents: isCollapsed ? 'none' : 'auto' }} // Prevent interactions when collapsed
    >
    {/* Header */}
    <div className="p-4 border-b border-[#2F2F2F]">
    <div className="flex items-center justify-between mb-3">
    <h2 className="text-white font-semibold text-lg">Chat History</h2>
    <button
    onClick={toggleSidebar}
    className="p-1.5 hover:bg-[#2F2F2F] rounded-md transition-colors"
    >
    <Menu className="w-4 h-4 text-white/60" />
    </button>
    </div>

    <button
    onClick={() => navigate('/chat')}
    className={cn(
      'w-full px-4 py-3 rounded-lg',
      'bg-[#2A2A2A] hover:bg-[#363636]',
      'border border-[#3F3F46]',
      'flex items-center justify-center gap-2',
      'text-white text-sm font-medium',
      'transition-all duration-200 hover:scale-[1.02]'
    )}
    >
    <Plus className="w-4 h-4" />
    New Chat
    </button>
    </div>

    {/* Session List - rest of your JSX remains the same */}
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3F3F46] scrollbar-track-transparent p-3">
    {/* Today */}
    {groupedSessions.today.length > 0 && (
      <div className="mb-6">
      <div className="px-2 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">Today</div>
      <div className="space-y-1">
      {groupedSessions.today.map((session) => (
        <button
        key={session.id}
        onClick={() => navigate(`/chat/${session.id}`)}
        className={cn(
          'w-full px-3 py-3 rounded-lg text-left',
          'flex items-start gap-3',
          'transition-all duration-200',
          'group',
          sessionId === String(session.id)
          ? 'bg-[#2A2A2A] border border-[#3F3F46] text-white'
          : 'hover:bg-[#2A2A2A] text-white/80 hover:text-white border border-transparent hover:border-[#2F2F2F]'
        )}
        >
        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/60 group-hover:text-white/80" />
        <span className="text-sm line-clamp-2 flex-1 text-left">
        {session.title || 'New conversation'}
        </span>
        </button>
      ))}
      </div>
      </div>
    )}

    {/* Yesterday */}
    {groupedSessions.yesterday.length > 0 && (
      <div className="mb-6">
      <div className="px-2 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">Yesterday</div>
      <div className="space-y-1">
      {groupedSessions.yesterday.map((session) => (
        <button
        key={session.id}
        onClick={() => navigate(`/chat/${session.id}`)}
        className={cn(
          'w-full px-3 py-3 rounded-lg text-left',
          'flex items-start gap-3',
          'transition-all duration-200',
          'group',
          sessionId === String(session.id)
          ? 'bg-[#2A2A2A] border border-[#3F3F46] text-white'
          : 'hover:bg-[#2A2A2A] text-white/80 hover:text-white border border-transparent hover:border-[#2F2F2F]'
        )}
        >
        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/60 group-hover:text-white/80" />
        <span className="text-sm line-clamp-2 flex-1 text-left">
        {session.title || 'New conversation'}
        </span>
        </button>
      ))}
      </div>
      </div>
    )}

    {/* Previous 7 Days */}
    {groupedSessions.week.length > 0 && (
      <div className="mb-6">
      <div className="px-2 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">Previous 7 Days</div>
      <div className="space-y-1">
      {groupedSessions.week.map((session) => (
        <button
        key={session.id}
        onClick={() => navigate(`/chat/${session.id}`)}
        className={cn(
          'w-full px-3 py-3 rounded-lg text-left',
          'flex items-start gap-3',
          'transition-all duration-200',
          'group',
          sessionId === String(session.id)
          ? 'bg-[#2A2A2A] border border-[#3F3F46] text-white'
          : 'hover:bg-[#2A2A2A] text-white/80 hover:text-white border border-transparent hover:border-[#2F2F2F]'
        )}
        >
        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/60 group-hover:text-white/80" />
        <span className="text-sm line-clamp-2 flex-1 text-left">
        {session.title || 'New conversation'}
        </span>
        </button>
      ))}
      </div>
      </div>
    )}

    {/* Older */}
    {groupedSessions.older.length > 0 && (
      <div className="mb-6">
      <div className="px-2 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">Older</div>
      <div className="space-y-1">
      {groupedSessions.older.map((session) => (
        <button
        key={session.id}
        onClick={() => navigate(`/chat/${session.id}`)}
        className={cn(
          'w-full px-3 py-3 rounded-lg text-left',
          'flex items-start gap-3',
          'transition-all duration-200',
          'group',
          sessionId === String(session.id)
          ? 'bg-[#2A2A2A] border border-[#3F3F46] text-white'
          : 'hover:bg-[#2A2A2A] text-white/80 hover:text-white border border-transparent hover:border-[#2F2F2F]'
        )}
        >
        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/60 group-hover:text-white/80" />
        <span className="text-sm line-clamp-2 flex-1 text-left">
        {session.title || 'New conversation'}
        </span>
        </button>
      ))}
      </div>
      </div>
    )}

    {/* Empty state */}
    {sessions.length === 0 && (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <MessageSquare className="w-16 h-16 text-white/20 mb-4" />
      <p className="text-sm text-white/40 mb-2">No conversations yet</p>
      <p className="text-xs text-white/30">Start a new chat to begin</p>
      </div>
    )}
    </div>
    </motion.aside>
    </AnimatePresence>
  );
};

export default MinimalSidebar;
