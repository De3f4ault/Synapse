/**
 * MinimalSidebar - Oracle Theme
 * "The Grimoire" - Navigation and History
 *
 * Location: chat/components/sidebar/MinimalSidebar.tsx
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listSessionsApiV1ChatSessionsGet } from '@/api/generated/services.gen';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { SessionList } from './SessionList';
import { UserAvatar } from './UserAvatar';

export const MinimalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebarCollapse();

  // Fetch logic
  const { data: response } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => listSessionsApiV1ChatSessionsGet({ limit: 50 }),
                                      refetchOnWindowFocus: false,
  });

  const sessions = response?.items ?? [];

  return (
    <motion.aside
    initial={false}
    animate={{
      width: isCollapsed ? 0 : 300,
      opacity: isCollapsed ? 0 : 1
    }}
    className="h-screen border-r border-white/5 bg-black/20 backdrop-blur-xl flex-shrink-0 overflow-hidden relative z-20"
    >
    <div className="p-6 w-[300px] flex flex-col h-screen">

    {/* Header - "Grimoire" */}
    <div className="p-6 pb-2">
    <div className="flex items-center gap-3 mb-8 text-cyan-100/80">
    <BookOpen size={20} />
    <span className="font-serif text-lg tracking-widest font-bold">GRIMOIRE</span>
    </div>

    <button
    onClick={() => navigate('/chat')}
    className={cn(
      'flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all group',
      'bg-white/5 hover:bg-white/10 border border-white/5',
      'text-xs font-bold tracking-[0.2em] text-cyan-200/70 hover:text-cyan-100'
    )}
    >
    <Plus size={14} className="group-hover:rotate-90 transition-transform" />
    NEW_INVOCATION
    </button>
    </div>

    {/* Session List Container */}
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
    <div>
    <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-3 pl-2">
    Previous Visions
    </div>
    <div className="space-y-1">
    {sessions.length > 0 ? (
      <SessionList sessions={sessions} />
    ) : (
      ['The Nature of Entropy', 'Quantum Entanglement', 'Code of the Void', 'System Architecture'].map((chat, i) => (
        <button
        key={i}
        className="w-full text-left px-3 py-2 text-sm font-serif text-slate-400 hover:text-cyan-100 hover:bg-cyan-900/10 rounded transition-colors truncate flex items-center gap-3 group"
        >
        <div className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-cyan-400 transition-colors" />
        {chat}
        </button>
      ))
    )}
    </div>
    </div>
    </div>

    {/* Footer - User Profile */}
    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
    <span>v10.0 // APOTHEOSIS</span>
    <UserAvatar isCollapsed={isCollapsed} />
    </div>

    </div>
    </motion.aside>
  );
};

export default MinimalSidebar;
