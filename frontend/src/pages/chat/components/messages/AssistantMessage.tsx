/**
 * AssistantMessage - NotebookLM Style
 * Simpler avatar with Google colors, cleaner layout
 *
 * Location: frontend/src/pages/chat/components/messages/AssistantMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MessageMarkdown } from './MessageMarkdown';
import { MessageActions } from './MessageActions';
import { ThinkingProcess } from './ThinkingProcess';
import type { MessageProps } from './Message';

export const AssistantMessage: React.FC<Omit<MessageProps, 'role'>> = ({
  content,
  isStreaming,
  timestamp,
  artifact,
  isDecryption,
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
    {/* Google-style Avatar */}
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#9B72CB] flex-shrink-0 flex items-center justify-center mt-1 shadow-lg shadow-purple-500/20 ring-1 ring-white/10">
    <Sparkles size={16} className="text-white fill-white/20" />
    </div>

    {/* Content Area */}
    <div className="flex flex-col items-start w-full min-w-0">
    <div className="text-base font-sans leading-8 w-full">
    {/* Thinking Process */}
    {isDecryption && <ThinkingProcess isStreaming={isStreaming} />}

    {/* Main Text Content */}
    <div className="min-h-[20px] text-white/90">
    <MessageMarkdown content={content} />
    </div>

    {/* Artifacts (if any) */}
    {artifact && (
      <div className="my-6 rounded-lg border border-white/10 bg-black/40 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
      <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
      {artifact.title}
      </span>
      </div>
      <div className="p-4 font-mono text-xs text-slate-300 bg-black/60 overflow-x-auto custom-scrollbar">
      <pre>{artifact.content}</pre>
      </div>
      </div>
    )}

    {/* Footer Actions */}
    {!isStreaming && <MessageActions content={content} />}
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
