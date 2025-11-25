import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendMessageApiV1ChatSessionsSessionIdMessagesPost,
  createSessionApiV1ChatSessionsPost,
} from '@/api/generated/services.gen';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Paperclip,
  Mic,
  ArrowUp,
  X,
  Globe,
  FileText,
  Image as ImageIcon,
  Sparkles,
  BrainCircuit
} from 'lucide-react';

interface MainInputProps {
  onMessageSent?: () => void;
  className?: string;
  isCentered?: boolean;
}

export type ChatMode = 'synapse' | 'standard' | 'web';

export const MainInput: React.FC<MainInputProps> = ({
  onMessageSent,
  className,
  isCentered = true,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('synapse');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Mutations
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
      toast.error(error.message || 'Failed to initialize Synapse session');
    },
  });

  // Submit Logic
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || sendMessageMutation.isPending) return;

    let finalContent = input.trim();
    if (mode === 'synapse') finalContent = `[SYNAPSE] ${finalContent}`;
    else if (mode === 'web') finalContent = `[WEB] ${finalContent}`;

    // Always create NEW session
    createSessionMutation.mutate(
      { requestBody: { title: input.slice(0, 50) || 'New Synapse Session' } },
                                 {
                                   onSuccess: (sessionData) => {
                                     sendMessageMutation.mutate({
                                       sessionId: sessionData.id,
                                       requestBody: { content: finalContent },
                                     }, {
                                       onSuccess: () => {
                                         navigate(`/chat/${sessionData.id}`);
                                       }
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

  // Drag & Drop
  const handleDrag = (e: React.DragEvent, status: boolean) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(status);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  const isLoading = createSessionMutation.isPending || sendMessageMutation.isPending;

  return (
    <div className={cn(
      'w-full transition-all duration-500 ease-out z-10',
      isCentered ? 'max-w-[760px] mx-auto' : 'w-full',
      className
    )}>

    {/* Synapse Mode Selector */}
    <div className="flex justify-center mb-6">
    <div className="bg-[#18181b]/60 backdrop-blur-xl p-1.5 rounded-full flex items-center border border-white/10 shadow-2xl ring-1 ring-white/5">
    {[
      { id: 'standard', label: 'Standard', icon: <Sparkles className="w-4 h-4 text-zinc-400" /> },
      { id: 'synapse', label: 'Synapse', icon: <BrainCircuit className="w-4 h-4 text-amber-400 fill-amber-400/20" /> },
      { id: 'web', label: 'Web', icon: <Globe className="w-4 h-4 text-emerald-400" /> },
    ].map((m) => (
      <button
      key={m.id}
      onClick={() => setMode(m.id as ChatMode)}
      className={cn(
        "relative px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-300",
        mode === m.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
      >
      {mode === m.id && (
        <motion.div
        layoutId="active-mode-pill"
        className="absolute inset-0 bg-[#3F3F46] rounded-full shadow-inner"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
      {m.icon} {m.label}
      </span>
      </button>
    ))}
    </div>
    </div>

    {/* Input Box */}
    <motion.div
    layout
    onDragEnter={(e) => handleDrag(e, true)}
    onDragOver={(e) => handleDrag(e, true)}
    onDragLeave={(e) => handleDrag(e, false)}
    onDrop={handleDrop}
    className={cn(
      "relative group rounded-[32px] bg-[#27272a] transition-all duration-300",
      "border border-white/5 shadow-2xl",
      isFocused ? "ring-2 ring-blue-500/20 border-blue-500/40" : "hover:border-white/10",
      isDragging && "border-dashed border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
    )}
    >
    <AnimatePresence>
    {isDragging && (
      <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 rounded-[32px] bg-[#27272a]/95 flex flex-col items-center justify-center text-amber-400 backdrop-blur-sm"
      >
      <Paperclip className="w-10 h-10 mb-3 animate-bounce" />
      <span className="font-semibold text-lg">Drop to analyze with Synapse</span>
      </motion.div>
    )}
    </AnimatePresence>

    <AnimatePresence>
    {attachedFiles.length > 0 && (
      <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="px-6 pt-5 flex gap-3 flex-wrap"
      >
      {attachedFiles.map((file, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-[#3F3F46] px-3 py-1.5 rounded-lg border border-white/10">
        {file.type.startsWith('image') ? <ImageIcon size={14} className="text-purple-400"/> : <FileText size={14} className="text-blue-400"/>}
        <span className="text-xs text-white/90 truncate max-w-[100px]">{file.name}</span>
        <button onClick={() => setAttachedFiles(f => f.filter((_, i) => i !== idx))} className="text-white/40 hover:text-white ml-1">
        <X size={12} />
        </button>
        </div>
      ))}
      </motion.div>
    )}
    </AnimatePresence>

    <textarea
    ref={textareaRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    onKeyDown={handleKeyDown}
    placeholder={
      mode === 'synapse' ? "Reason with Synapse..." :
      mode === 'web' ? "Search the globe..." :
      "Ask anything..."
    }
    className="w-full bg-transparent text-[16px] text-white/90 placeholder:text-white/20 px-6 py-5 min-h-[64px] max-h-[400px] resize-none focus:outline-none leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700"
    rows={1}
    />

    <div className="flex justify-between items-center px-4 pb-4">
    <div className="flex items-center gap-1">
    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors tooltip" title="Attach Files">
    <Paperclip size={20} />
    </button>
    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => e.target.files && setAttachedFiles(p => [...p, ...Array.from(e.target.files)])} />

    <button className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors" title="Voice Input">
    <Mic size={20} />
    </button>
    </div>

    <button
    onClick={() => handleSubmit()}
    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
    className={cn(
      "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
      (input.trim() || attachedFiles.length > 0) && !isLoading
      ? "bg-white text-black hover:scale-110 hover:shadow-glow-white"
      : "bg-[#3F3F46] text-zinc-500 cursor-not-allowed"
    )}
    >
    {isLoading ? <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <ArrowUp size={22} strokeWidth={2.5} />}
    </button>
    </div>
    </motion.div>

    {isCentered && (
      <p className="mt-6 text-center text-xs text-zinc-600 font-medium">
      Synapse AI can make mistakes. Please verify important information.
      </p>
    )}
    </div>
  );
};
