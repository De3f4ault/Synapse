/**
 * AssistantMessage - Oracle Theme
 * "The Oracle" - Left aligned, mystical, cyan glow, artifact aware.
 *
 * Location: chat/components/messages/AssistantMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Eclipse, Terminal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageMarkdown } from './MessageMarkdown';
import { MessageActions } from './MessageActions';
import { ThinkingProcess } from './ThinkingProcess';
import type { MessageProps } from './Message';

// Artifact Card Component (Internal for now, or could be extracted)
const ArtifactCard = ({ title, type, content }: { title: string, type: string, content: string }) => (
  <div className="my-6 rounded-lg border border-white/10 bg-black/40 overflow-hidden shadow-lg shadow-black/50">
  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
  <div className="flex items-center gap-2">
  {type === 'code' ? <Terminal size={12} className="text-amber-400"/> : <Activity size={12} className="text-emerald-400"/>}
  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">{title}</span>
  </div>
  <div className="flex gap-1.5">
  <div className="w-2 h-2 rounded-full bg-red-500/20" />
  <div className="w-2 h-2 rounded-full bg-amber-500/20" />
  <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
  </div>
  </div>
  <div className="p-4 font-mono text-xs text-slate-300 bg-black/60 overflow-x-auto custom-scrollbar">
  <pre>{content}</pre>
  </div>
  </div>
);

export const AssistantMessage: React.FC<Omit<MessageProps, 'role'>> = ({
  content,
  isStreaming,
  timestamp,
  artifact,
  isDecryption
}) => {
  const timeString = timestamp
  ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '';

  return (
    <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex w-full justify-start pr-12 mb-8 group"
    >
    <div className="flex gap-6 max-w-3xl w-full">
    {/* Oracle Avatar */}
    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border border-cyan-500/30 bg-black text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.1)] mt-1">
    <Eclipse size={18} />
    </div>

    {/* Content Area */}
    <div className="flex flex-col items-start w-full min-w-0">
    <div className={cn(
      "text-base font-serif leading-8 rounded-2xl rounded-tl-sm px-6 py-4 w-full shadow-xl backdrop-blur-md",
      "bg-black/60 border border-cyan-900/30 text-cyan-50 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
    )}>

    {/* Decryption/Thinking Process */}
    {isDecryption && <ThinkingProcess isStreaming={isStreaming} />}

    {/* Main Text Content */}
    <div className="min-h-[20px]">
    <MessageMarkdown content={content} />
    </div>

    {/* Artifacts (Visualizations/Code/Stats) */}
    {artifact && (
      <ArtifactCard
      title={artifact.title}
      type={artifact.type}
      content={artifact.content}
      />
    )}

    {/* Footer Actions */}
    {!isStreaming && (
      <MessageActions content={content} />
    )}
    </div>

    {/* Timestamp */}
    <div className="mt-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-50 transition-opacity">
    {timeString}
    </div>
    </div>
    </div>
    </motion.div>
  );
};

export default AssistantMessage;
