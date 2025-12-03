/**
 * MinimalSidebar - Oracle Theme
 * "The Grimoire" - Navigation and History with Real Sessions
 *
 * Location: frontend/src/pages/chat/components/sidebar/MinimalSidebar.tsx
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { useChatSessions } from '../../hooks/useChatSession';
import { SessionList } from './SessionList';
import { UserAvatar } from './UserAvatar';

export const MinimalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebarCollapse();

  // Fetch real sessions from API
  const { data: sessions = [], isLoading } = useChatSessions();

  const handleNewChat = () => {
    // Navigate to base chat route (will show welcome screen)
    navigate('/chat');
  };

  return (
    <motion.aside
    initial={false}
    animate={{
      width: isCollapsed ? 0 : 300,
      opacity: isCollapsed ? 0 : 1,
    }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="h-screen border-r border-white/5 bg-black/20 backdrop-blur-xl flex-shrink-0 overflow-hidden relative z-20"
    >
    <div className="w-[300px] h-full flex flex-col">
    {/* Header - "Grimoire" */}
    <div className="p-6 pb-4 flex-shrink-0">
    <div className="flex items-center gap-3 mb-6 text-cyan-100/80">
    <BookOpen size={20} className="text-cyan-400" />
    <span className="font-serif text-lg tracking-widest font-bold">
    GRIMOIRE
    </span>
    </div>

    {/* New Invocation Button */}
    <button
    onClick={handleNewChat}
    className={cn(
      'flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all group',
      'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30',
      'text-xs font-bold tracking-[0.2em] text-cyan-200/70 hover:text-cyan-100',
      'shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]'
    )}
    >
    <Plus
    size={14}
    className="group-hover:rotate-90 transition-transform duration-300"
    />
    NEW_INVOCATION
    </button>
    </div>

    {/* Session List Container - Scrollable */}
    <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
    <div className="pb-4">
    {/* Section Header */}
    <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-3 px-3">
    Previous Visions
    </div>

    {/* Real Sessions or Empty State */}
    <SessionList sessions={sessions} isLoading={isLoading} />
    </div>
    </div>

    {/* Footer - User Profile */}
    <div className="p-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono flex-shrink-0">
    <span className="tracking-wider">v10.0 // APOTHEOSIS</span>
    <UserAvatar isCollapsed={false} />
    </div>
    </div>
    </motion.aside>
  );
};

export default MinimalSidebar;
