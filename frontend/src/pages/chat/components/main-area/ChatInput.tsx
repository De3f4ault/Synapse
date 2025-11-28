/**
 * ChatInput - Oracle Theme
 * The "Altar of Query". Implements the floating, glowing input bar
 * with Deep Gnosis toggle and audio visualization.
 *
 * Location: chat/components/main-area/ChatInput.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Mic, Paperclip, X, Sparkles,
  Zap, MicOff, FileCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessageResponse } from "@/api/generated/types.gen";
import { sendMessageApiV1ChatSessionsSessionIdMessagesPost } from "@/api/generated/services.gen";

interface ChatInputProps {
  sessionId?: number;
  onMessageSent?: () => void;
  className?: string;
}

// Visualizer for Audio Input
const AudioWaveform = () => (
  <div className="flex items-center justify-center gap-1 h-8 w-full">
  {[...Array(20)].map((_, i) => (
    <motion.div
    key={i}
    className="w-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full"
    animate={{ height: [10, Math.random() * 24 + 8, 10] }}
    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
    />
  ))}
  </div>
);

export const ChatInput: React.FC<ChatInputProps> = ({
  sessionId,
  onMessageSent,
  className,
}) => {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDeepGnosis, setIsDeepGnosis] = useState(false); // Local toggle for now

  // --- API LOGIC (Preserved) ---
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
    sendMessageApiV1ChatSessionsSessionIdMessagesPost({
      sessionId: sessionId!,
      requestBody: { content },
    }),
    onSuccess: (response) => {
      queryClient.setQueryData<ChatMessageResponse[]>(
        ['chat-messages', sessionId],
        (old = []) => [...old, response]
      );
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
    },
    onError: () => toast.error("The Oracle could not receive your query."),
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!sessionId || (!input.trim() && !isListening) || sendMutation.isPending) return;

    const content = input.trim();
    // Optimistic Update
    const optimisticUserMessage: ChatMessageResponse = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: content || "[Voice Transmission]",
      tokens: 0,
      model_used: null,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<ChatMessageResponse[]>(
      ['chat-messages', sessionId],
      (old = []) => [...old, optimisticUserMessage]
    );

    setInput("");
    setAttachedFiles([]);
    setIsListening(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      await sendMutation.mutateAsync(content);
      onMessageSent?.();
    } catch (error) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLoading = sendMutation.isPending;

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  return (
    <div className={cn("p-8 pb-10 flex flex-col items-center relative z-40", className)}>

    {/* Deep Gnosis Toggle (The "Zap" button above input) */}
    <div className="flex justify-center mb-[-1px] z-10">
    <button
    onClick={() => setIsDeepGnosis(!isDeepGnosis)}
    type="button"
    className={cn(
      "flex items-center gap-2 px-4 py-1.5 rounded-t-xl border-t border-x border-b-0 backdrop-blur-md transition-all duration-300",
      isDeepGnosis
      ? "bg-amber-950/40 border-amber-500/30 text-amber-400 shadow-[0_-5px_20px_rgba(245,158,11,0.1)]"
      : "bg-black/40 border-white/5 text-slate-500 hover:text-slate-300"
    )}
    >
    <Zap size={12} fill={isDeepGnosis ? "currentColor" : "none"} />
    <span className="text-[10px] font-bold tracking-widest uppercase">
    Deep Gnosis {isDeepGnosis ? 'Active' : 'Offline'}
    </span>
    </button>
    </div>

    {/* Main Input Container */}
    <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-full max-w-3xl relative group"
    >
    {/* Animated Glow Border */}
    <div
    className={cn(
      "absolute -inset-[2px] bg-gradient-to-r rounded-[2.5rem] blur-xl transition-opacity duration-500",
      isDeepGnosis
      ? "from-amber-500/30 via-red-500/30 to-amber-500/30"
      : "from-cyan-500/20 via-purple-500/20 to-cyan-500/20",
      (isFocused || isLoading || isListening) ? 'opacity-60 animate-pulse' : 'opacity-0 group-hover:opacity-30'
    )}
    />

    <div
    className={cn(
      "relative bg-[#080a0e] rounded-[2.5rem] border border-white/10 flex items-center p-2 shadow-2xl transition-all duration-300",
      isFocused && "border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)]",
                  isListening && "border-purple-500/50"
    )}
    >
    {/* Left Actions */}
    <div className="flex items-center gap-1 pl-4 pr-3 border-r border-white/5 h-10">
    <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="p-2 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all"
    title="Inject Data Artifact"
    >
    {isDeepGnosis ? <FileCode size={20} className="text-amber-500"/> : <Paperclip size={20} />}
    </button>
    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => setAttachedFiles(Array.from(e.target.files || []))} />

    <button
    type="button"
    onClick={() => setIsListening(!isListening)}
    className={cn(
      "p-2 rounded-full transition-all",
      isListening ? "text-red-500 bg-red-500/10 animate-pulse" : "text-slate-500 hover:text-purple-400 hover:bg-white/5"
    )}
    title="Telepathic Voice Invocation"
    >
    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
    </div>

    {/* Input Field / Audio Vis */}
    <div className="flex-1 px-4 relative flex items-center min-h-[48px]">
    {isListening ? (
      <div className="w-full flex items-center justify-between">
      <span className="text-xs font-mono text-purple-400 animate-pulse tracking-widest">RECEIVING SIGNAL...</span>
      <AudioWaveform />
      </div>
    ) : (
      <textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      placeholder={isDeepGnosis ? "Deep Gnosis Active. Enter complex query..." : "Ask the Oracle..."}
      className={cn(
        "w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-sans text-base transition-colors resize-none overflow-hidden py-3",
        isDeepGnosis && 'placeholder:text-amber-500/50'
      )}
      disabled={isLoading}
      rows={1}
      />
    )}
    </div>

    {/* Send Button */}
    <button
    onClick={() => handleSubmit()}
    disabled={(!input.trim() && !isListening) || isLoading}
    className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
      (input.trim() || isListening) && !isLoading
      ? `bg-${isDeepGnosis ? 'amber' : 'cyan'}-600 hover:bg-${isDeepGnosis ? 'amber' : 'cyan'}-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)] scale-100`
      : 'bg-white/5 text-slate-600 scale-90 cursor-not-allowed'
    )}
    >
    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={(input.trim() || isListening) ? "ml-0.5" : ""} />}
    </button>
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
    </div>
  );
};

export default ChatInput;
