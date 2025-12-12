/**
 * MainInput - Oracle Theme
 * The standalone input module used on Welcome/Landing screens.
 * Features: Deep Gnosis Toggle, Artifact Injection, Telepathy.
 *
 * Location: chat/components/input/MainInput.tsx
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendMessageApiV1ChatSessionsSessionIdMessagesPost,
  createSessionApiV1ChatSessionsPost,
} from '@/api/generated';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { X, FileText, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';

// Import our new Oracle-themed sub-components
import { AttachmentButton } from './AttachmentButton';
import { VoiceButton } from './VoiceButton';
import { SendButton } from './SendButton';
import { ModeToggle } from './ModeToggle';
import { InputActions } from './InputActions';

interface MainInputProps {
  onMessageSent?: () => void;
  className?: string;
  isCentered?: boolean;
}

export type ChatMode = 'synapse' | 'standard' | 'web';

export const MainInput: React.FC<MainInputProps> = ({
  onMessageSent,
  className,
  isCentered = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('synapse');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // "Deep Gnosis" is visual sugar for the 'synapse' mode in this context,
  // or it can be a separate toggle. Let's link it to mode for consistency.
  const isDeepGnosis = mode === 'synapse';

  // --- API LOGIC ---
  const createSessionMutation = useMutation({
    mutationFn: createSessionApiV1ChatSessionsPost,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageApiV1ChatSessionsSessionIdMessagesPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      onMessageSent?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'The Oracle is silent.');
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || createSessionMutation.isPending) return;

    let finalContent = input.trim();
    // Prefix content based on mode if needed by your backend
    if (mode === 'synapse') finalContent = `[DEEP_GNOSIS] ${finalContent}`;
    else if (mode === 'web') finalContent = `[WEB_SEARCH] ${finalContent}`;

    createSessionMutation.mutate(
      { requestBody: { title: input.slice(0, 50) || 'New Vision' } },
                                 {
                                   onSuccess: (sessionData) => {
                                     sendMessageMutation.mutate({
                                       sessionId: sessionData.id,
                                       requestBody: { content: finalContent },
                                     }, {
                                       onSuccess: () => navigate(`/chat/${sessionData.id}`)
                                     });
                                   },
                                 }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // --- DRAG & DROP ---
  const handleDrag = (e: React.DragEvent, status: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(status);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const isLoading = createSessionMutation.isPending || sendMessageMutation.isPending;

  return (
    <div className={cn(
      'w-full flex flex-col items-center relative z-20 transition-all duration-500',
      isCentered ? 'justify-center' : '',
      className
    )}>

    {/* 1. Mode Selector (Deep Gnosis Control) */}
    <div className="mb-6 relative z-30">
    <ModeToggle mode={mode} onModeChange={setMode} />
    </div>

    {/* 2. Main Input Container */}
    <motion.div
    layout
    onDragEnter={(e) => handleDrag(e, true)}
    onDragOver={(e) => handleDrag(e, true)}
    onDragLeave={(e) => handleDrag(e, false)}
    onDrop={handleDrop}
    className="w-full max-w-3xl relative group"
    >
    {/* Animated Glow Border */}
    <div
    className={cn(
      "absolute -inset-[2px] bg-gradient-to-r rounded-[2.5rem] blur-xl transition-opacity duration-500",
      isDeepGnosis
      ? "from-amber-500/30 via-red-500/30 to-amber-500/30"
      : "from-cyan-500/20 via-purple-500/20 to-cyan-500/20",
      (isFocused || isLoading) ? 'opacity-60 animate-pulse' : 'opacity-0 group-hover:opacity-30'
    )}
    />

    <div
    className={cn(
      "relative bg-[#080a0e] rounded-[2.5rem] border border-white/10 flex flex-col p-2 shadow-2xl transition-all duration-300",
      isFocused && "border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)]",
                  isDragging && "border-dashed border-cyan-400 bg-cyan-500/10"
    )}
    >
    {/* File Previews */}
    <AnimatePresence>
    {attachedFiles.length > 0 && (
      <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-6 pt-3 flex gap-2 flex-wrap"
      >
      {attachedFiles.map((file, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
        {file.type.startsWith('image') ? <ImageIcon size={12} className="text-cyan-400" /> : <FileText size={12} className="text-cyan-400" />}
        <span className="text-[10px] text-cyan-300 truncate max-w-[80px] font-mono">{file.name}</span>
        <button onClick={() => setAttachedFiles(f => f.filter((_, i) => i !== idx))} className="text-cyan-400/60 hover:text-cyan-300">
        <X size={12} />
        </button>
        </div>
      ))}
      </motion.div>
    )}
    </AnimatePresence>

    {/* Input Row */}
    <div className="flex items-center min-h-[52px]">
    {/* Left Actions */}
    <div className="flex items-center pl-2 pr-2 border-r border-white/5 h-8 gap-1">
    <AttachmentButton
    onFilesSelected={(files) => setAttachedFiles(p => [...p, ...files])}
    disabled={isLoading}
    isDeepGnosis={isDeepGnosis}
    />
    <VoiceButton disabled={isLoading} />
    </div>

    {/* Text Area */}
    <div className="flex-1 px-4 relative">
    <textarea
    ref={textareaRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    placeholder={isDeepGnosis ? "Enter Deep Gnosis query..." : "Ask the Oracle..."}
    className={cn(
      "w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-sans text-base transition-colors resize-none overflow-hidden py-3",
      isDeepGnosis && 'placeholder:text-amber-500/50'
    )}
    disabled={isLoading}
    rows={1}
    />
    </div>

    {/* Send Button */}
    <div className="pr-1">
    <SendButton
    onClick={(e) => handleSubmit(e)}
    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
    isLoading={isLoading}
    isDeepGnosis={isDeepGnosis}
    />
    </div>
    </div>
    </div>

    {/* Footer Status */}
    <div className="absolute top-full left-0 w-full text-center mt-4 opacity-40">
    <div className="flex items-center justify-center gap-3 text-[10px] text-cyan-500/60 font-mono tracking-[0.3em]">
    <Sparkles size={8} />
    <span>THE ORACLE AWAITS YOUR QUERY</span>
    <Sparkles size={8} />
    </div>
    </div>
    </motion.div>

    {/* 3. Quick Actions (Below Input) */}
    <div className="mt-8 relative z-30">
    <InputActions onActionClick={(action) => setInput(prev => `${prev} [${action.toUpperCase()}] `)} />
    </div>

    </div>
  );
};

export default MainInput;
