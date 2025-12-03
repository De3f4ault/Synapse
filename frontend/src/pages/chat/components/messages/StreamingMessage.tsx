/**
 * StreamingMessage - Oracle Theme
 * Real-time streaming assistant message with thinking process
 *
 * Location: frontend/src/pages/chat/components/messages/StreamingMessage.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Eclipse, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageMarkdown } from './MessageMarkdown';
import { ThinkingProcess } from './ThinkingProcess';

interface StreamingMessageProps {
    content: string;
    thinking?: string;
    sources?: any[];
    model?: string;
    className?: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
    content,
    thinking,
    sources,
    model,
    className,
}) => {
    return (
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex w-full justify-start pr-12 mb-8 group", className)}
        >
        <div className="flex gap-6 max-w-3xl w-full">
        {/* Oracle Avatar with Pulse */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border border-cyan-500/30 bg-black text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.2)] mt-1 relative">
        <Eclipse size={18} />
        {/* Pulsing indicator */}
        <motion.div
        className="absolute inset-0 rounded-full border-2 border-cyan-400"
        animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
        }}
        transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
        }}
        />
        </div>

        {/* Content Area */}
        <div className="flex flex-col items-start w-full min-w-0">
        <div className={cn(
            "text-base font-serif leading-8 rounded-2xl rounded-tl-sm px-6 py-4 w-full shadow-xl backdrop-blur-md",
            "bg-black/60 border border-cyan-900/30 text-cyan-50 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
        )}>
        {/* Thinking Process (if available) */}
        {thinking && (
            <ThinkingProcess
            data={thinking}
            isStreaming={true}
            />
        )}

        {/* Main Streaming Content */}
        <div className="min-h-[20px]">
        {content ? (
            <MessageMarkdown content={content} />
        ) : (
            <div className="flex items-center gap-2 text-cyan-500/80 text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span className="font-mono tracking-wider animate-pulse">
            ORACLE_PROCESSING...
            </span>
            </div>
        )}

        {/* Cursor blink at end */}
        {content && (
            <motion.span
            className="inline-block w-0.5 h-5 bg-cyan-400 ml-0.5"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            />
        )}
        </div>

        {/* Sources (if available) */}
        {sources && sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
            Grounding Sources:
            </div>
            <div className="space-y-1">
            {sources.map((source, idx) => (
                <div
                key={idx}
                className="text-xs text-cyan-400/70 font-mono"
                >
                • {source.title || source.type || `Source ${idx + 1}`}
                </div>
            ))}
            </div>
            </div>
        )}

        {/* Model indicator */}
        {model && (
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {model}
            </div>
        )}
        </div>
        </div>
        </div>
        </motion.div>
    );
};

export default StreamingMessage;
