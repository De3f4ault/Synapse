/**
 * ChatInput - NotebookLM Style
 * Simplified input without Deep Gnosis toggle
 * Shows source count badge
 *
 * Location: frontend/src/pages/chat/components/main-area/ChatInput.tsx
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Paperclip, X, Layers, ArrowRight } from 'lucide-react';
import { useChatStreaming } from '../../hooks/useChatStreaming';
import { toast } from 'sonner';

interface ChatInputProps {
  sessionId?: number;
  sourceCount?: number;
  onMessageSent?: () => void;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  sessionId,
  sourceCount = 0,
  onMessageSent,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isConnected,
    isStreaming,
    connectionState,
    sendMessage,
  } = useChatStreaming({
    sessionId,
    autoConnect: true,
  });

  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
  textareaRef.current.style.height = `${Math.min(
    textareaRef.current.scrollHeight,
    180
  )}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!sessionId) {
        toast.error('No active session');
        return;
      }

      if (!input.trim() && attachedFiles.length === 0) {
        toast.info('Please enter a message');
        return;
      }

      if (isStreaming) {
        toast.error('Please wait for current response');
        return;
      }

      if (connectionState !== 'connected' || !isConnected) {
        toast.error('Not connected. Please wait...');
        return;
      }

      const content = input.trim();

      try {
        const success = await sendMessage(content);

        if (success) {
          setInput('');
          setAttachedFiles([]);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
          onMessageSent?.();
          toast.success('Message sent');
        } else {
          toast.error('Failed to send message');
        }
      } catch (error: any) {
        console.error('Error sending message:', error);
        toast.error(error.message || 'Failed to send message');
      }
    },
    [input, attachedFiles, isStreaming, connectionState, isConnected, sessionId, sendMessage, onMessageSent]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(files);
      toast.success(`Attached ${files.length} file${files.length > 1 ? 's' : ''}`);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((files) => {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const isDisabled = sourceCount === 0 || connectionState !== 'connected';

  return (
    <div className={className}>
    {/* File attachments preview */}
    {attachedFiles.length > 0 && (
      <div className="mb-4 flex flex-wrap gap-2">
      {attachedFiles.map((file, index) => (
        <div
        key={index}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#A8C7FA]/10 border border-[#A8C7FA]/20 text-[#A8C7FA] text-xs"
        >
        <Paperclip size={12} />
        <span className="truncate max-w-[150px]">{file.name}</span>
        <button
        type="button"
        onClick={() => removeFile(index)}
        className="text-[#A8C7FA] hover:text-red-400 transition-colors"
        title="Remove file"
        >
        <X size={12} />
        </button>
        </div>
      ))}
      </div>
    )}

    {/* Main Input Container */}
    <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="w-full relative group"
    >
    {/* Animated Glow Border */}
    <div
    className={`absolute -inset-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-[2.5rem] blur-xl transition-opacity duration-500 ${
      isFocused || isStreaming ? 'opacity-60 animate-pulse' : 'opacity-0 group-hover:opacity-30'
    }`}
    />

    <div
    className={`relative notebook-input-container transition-all duration-300 ${
      isFocused && 'border-white/20'
    } ${isDisabled && 'opacity-50 pointer-events-none'}`}
    >
    {/* Input Row */}
    <div className="flex items-center min-h-[52px]">
    {/* Left Actions */}
    <div className="flex items-center pl-2 pr-2 border-r border-white/5 h-8 gap-1">
    <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={isStreaming}
    className="p-2.5 rounded-full transition-all duration-300 text-slate-500 hover:text-[#A8C7FA] hover:bg-white/5 disabled:opacity-50"
    title="Attach file"
    >
    <Paperclip size={20} />
    </button>
    <input
    ref={fileInputRef}
    type="file"
    multiple
    className="hidden"
    onChange={handleFileChange}
    disabled={isStreaming}
    />
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
    placeholder={
      isDisabled
      ? 'Add sources to start chatting...'
      : 'Ask anything about your sources...'
    }
    className="w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-sans text-base transition-colors resize-none overflow-hidden py-3"
    disabled={isStreaming || isDisabled}
    rows={1}
    />
    </div>

    {/* Source Count Badge + Send Button */}
    <div className="flex items-center gap-3 pr-1">
    {sourceCount > 0 && (
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
      <Layers size={12} className="text-[#A8C7FA]" />
      <span className="text-[10px] text-white/60 font-medium">
      {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
      </span>
      </div>
    )}

    <button
    onClick={() => handleSubmit()}
    disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming || isDisabled}
    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
      (input.trim() || attachedFiles.length > 0) && !isStreaming && !isDisabled
      ? 'bg-[#A8C7FA] text-black scale-100 shadow-[0_0_15px_rgba(168,199,250,0.3)]'
      : 'bg-white/5 text-slate-600 scale-90'
    }`}
    title={isDisabled ? 'Add sources first' : 'Send message'}
    >
    {isStreaming ? (
      <Loader2 size={20} className="animate-spin" />
    ) : (
      <ArrowRight size={20} className={input.trim() || attachedFiles.length > 0 ? 'ml-0.5' : ''} />
    )}
    </button>
    </div>
    </div>
    </div>

    {/* Footer Status */}
    <div className="absolute top-full left-0 w-full text-center mt-4 opacity-40">
    <div className="flex items-center justify-center gap-3 text-[10px] text-[#A8C7FA]/60 font-mono tracking-[0.2em]">
    <span>
    {connectionState === 'connecting'
      ? 'CONNECTING...'
      : connectionState !== 'connected'
      ? 'DISCONNECTED'
      : isStreaming
      ? 'GENERATING...'
  : sourceCount === 0
  ? 'ADD SOURCES TO BEGIN'
  : 'READY'}
  </span>
  </div>
  </div>
  </motion.div>

  {/* Keyboard Shortcuts Hint */}
  <div className="mt-6 text-xs text-slate-600 font-mono opacity-40 text-center">
  <div className="flex items-center justify-center gap-4">
  <span>Enter: Send</span>
  <span>Shift+Enter: New Line</span>
  </div>
  </div>
  </div>
  );
};

export default ChatInput;
