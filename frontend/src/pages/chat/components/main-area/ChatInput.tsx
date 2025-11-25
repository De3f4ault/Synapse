/**
 * ChatInput.tsx - REST API Fallback (No WebSocket)
 * Instant optimistic updates with REST API
 */

import React, { useState, useRef, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Mic, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessageResponse } from "@/api/generated/types.gen";
import { sendMessageApiV1ChatSessionsSessionIdMessagesPost } from "@/api/generated/services.gen";

interface ChatInputProps {
  sessionId?: number;
  onMessageSent?: () => void;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  sessionId,
  onMessageSent,
  className,
}) => {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // REST API mutation
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
    sendMessageApiV1ChatSessionsSessionIdMessagesPost({
      sessionId: sessionId!,
      requestBody: { content },
    }),
    onSuccess: (response) => {
      // Add AI response to cache
      queryClient.setQueryData<ChatMessageResponse[]>(
        ['chat-messages', sessionId],
        (old = []) => [...old, response]
      );

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: (error: any, content, context: any) => {
      toast.error("Failed to send message");

      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chat-messages', sessionId],
          context.previousMessages
        );
      }
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!sessionId) {
      toast.error("No active session");
      return;
    }

    if (!input.trim() || sendMutation.isPending) return;

    const content = input.trim();

    // 1. INSTANT optimistic update - add user message immediately
    const optimisticUserMessage: ChatMessageResponse = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content,
      tokens: 0,
      model_used: null,
      created_at: new Date().toISOString(),
    };

    // Save previous messages for rollback
    const previousMessages = queryClient.getQueryData<ChatMessageResponse[]>([
      'chat-messages',
      sessionId,
    ]);

    queryClient.setQueryData<ChatMessageResponse[]>(
      ['chat-messages', sessionId],
      (old = []) => [...old, optimisticUserMessage]
    );

    // 2. Clear input immediately
    setInput("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // 3. Send via REST API
    try {
      await sendMutation.mutateAsync(content);
      onMessageSent?.();
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Drag & Drop handlers
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
      setAttachedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const isLoading = sendMutation.isPending;

  return (
    <div
    className={cn(
      "sticky bottom-0 z-40",
      "bg-gradient-to-t from-[#151517] via-[#151517] to-transparent",
      "pb-6 pt-4 px-4",
      className
    )}
    >
    <motion.form
    onSubmit={handleSubmit}
    onDragEnter={(e) => handleDrag(e, true)}
    onDragOver={(e) => handleDrag(e, true)}
    onDragLeave={(e) => handleDrag(e, false)}
    onDrop={handleDrop}
    animate={{ scale: isFocused ? 1.005 : 1 }}
    className={cn(
      "relative max-w-4xl mx-auto rounded-2xl",
      "bg-[#27272a] backdrop-blur-xl",
      "border transition-all duration-200",
      isFocused ? "border-zinc-500 shadow-xl" : "border-white/5 shadow-lg",
      isDragging && "border-dashed border-blue-500 bg-blue-500/5"
    )}
    >
    {/* File Preview */}
    <AnimatePresence>
    {attachedFiles.length > 0 && (
      <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-hide"
      >
      {attachedFiles.map((file, idx) => (
        <div
        key={idx}
        className="flex-shrink-0 flex items-center gap-1.5 bg-[#3F3F46] px-2 py-1 rounded-md border border-white/5"
        >
        <span className="text-[10px] text-white/80 max-w-[80px] truncate">
        {file.name}
        </span>
        <button
        type="button"
        onClick={() =>
          setAttachedFiles((f) => f.filter((_, i) => i !== idx))
        }
        className="text-white/40 hover:text-white"
        >
        <X size={10} />
        </button>
        </div>
      ))}
      </motion.div>
    )}
    </AnimatePresence>

    {/* Input Row */}
    <div className="flex items-end gap-2 p-2 pl-3">
    {/* Attachments */}
    <div className="flex gap-1 pb-1">
    <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
    >
    <Plus className="w-5 h-5" />
    </button>

    <input
    type="file"
    ref={fileInputRef}
    multiple
    className="hidden"
    onChange={(e) =>
      e.target.files &&
      setAttachedFiles((p) => [...p, ...Array.from(e.target.files!)])
    }
    />

    {/* Voice */}
    <button
    type="button"
    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block"
    >
    <Mic className="w-5 h-5" />
    </button>
    </div>

    {/* Textarea */}
    <textarea
    ref={textareaRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    placeholder="Reply to Synapse..."
    disabled={isLoading || !sessionId}
    rows={1}
    className={cn(
      "flex-1 py-3 px-2",
      "bg-transparent text-white placeholder:text-zinc-500",
      "resize-none outline-none text-[15px] leading-relaxed",
      "max-h-[180px] overflow-y-auto scrollbar-hide",
      (!sessionId || isLoading) && "opacity-50 cursor-not-allowed"
    )}
    />

    {/* Send Button */}
    <button
    type="submit"
    disabled={!input.trim() || isLoading || !sessionId}
    className={cn(
      "mb-1 p-2 rounded-xl transition-all duration-200",
      input.trim() && !isLoading && sessionId
      ? "bg-blue-600 text-white shadow-lg hover:bg-blue-500"
      : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
    )}
    >
    {isLoading ? (
      <Loader2 className="w-5 h-5 animate-spin" />
    ) : (
      <Send className="w-5 h-5 ml-0.5" />
    )}
    </button>
    </div>
    </motion.form>

    <div className="text-center mt-2 hidden sm:block">
    <span className="text-[10px] text-zinc-600">
    {isLoading ? "Sending message..." : "Enter to send, Shift+Enter for newline"}
    </span>
    </div>
    </div>
  );
};

export default ChatInput;
