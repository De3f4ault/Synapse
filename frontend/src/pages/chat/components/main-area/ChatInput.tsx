/**
<<<<<<< HEAD
 * ChatInput - Oracle Theme with Unified WebSocket (UPDATED)
 * Uses centralized WebSocketManager with channel subscriptions
=======
 * ChatInput - Oracle Theme with WebSocket Streaming (FIXED)
 * The "Altar of Query" with comprehensive debugging and synchronized WebSocket states
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send, Loader2, Mic, Paperclip, X, Sparkles,
  Zap, MicOff, FileCode, WifiOff, Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
<<<<<<< HEAD
import { useChatStreaming } from '../../hooks/useChatStreaming';
=======
import { useStreamingResponse } from '../../hooks/useStreamingResponse';
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a

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

// Connection status badge component
const ConnectionStatus = ({ state, webSocketReadyState }: {
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  webSocketReadyState?: number;
}) => {
  const getStatusConfig = () => {
    switch (state) {
      case 'connecting':
        return {
          text: 'CONNECTING TO ORACLE...',
          color: 'text-amber-400',
          bg: 'bg-amber-900/20',
          border: 'border-amber-500/30',
          icon: <Loader2 size={14} className="animate-spin" />
        };
      case 'connected':
        const wsStateName = webSocketReadyState === 1 ? 'OPEN' :
        webSocketReadyState === 0 ? 'CONNECTING' :
        webSocketReadyState === 2 ? 'CLOSING' :
        webSocketReadyState === 3 ? 'CLOSED' : 'UNKNOWN';
        return {
          text: `ORACLE CONNECTED (${wsStateName})`,
          color: 'text-emerald-400',
          bg: 'bg-emerald-900/20',
          border: 'border-emerald-500/30',
          icon: <Wifi size={14} />
        };
      case 'error':
        return {
          text: 'ORACLE CONNECTION ERROR',
          color: 'text-red-400',
          bg: 'bg-red-900/20',
          border: 'border-red-500/30',
          icon: <WifiOff size={14} className="animate-pulse" />
        };
      default: // disconnected
        return {
          text: 'ORACLE DISCONNECTED',
          color: 'text-slate-400',
          bg: 'bg-slate-900/20',
          border: 'border-slate-500/30',
          icon: <WifiOff size={14} />
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono transition-all duration-300",
      config.bg,
      config.border,
      config.color
    )}>
    {config.icon}
    <span>{config.text}</span>
    </div>
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  sessionId,
  onMessageSent,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

<<<<<<< HEAD
  // WebSocket streaming hook - NOW USES UNIFIED MANAGER
=======
  // WebSocket streaming hook with enhanced debugging
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
  const {
    isConnected,
    isStreaming,
    connectionState,
    sendMessage,
<<<<<<< HEAD
    webSocketReadyState,
    isConnectionConfirmed,
  } = useChatStreaming({
=======
    connect,
    disconnect,
    webSocketReadyState,
    isConnectionConfirmed,
  } = useStreamingResponse({
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
    sessionId,
    autoConnect: true,
    onStateChange: (state) => {
      console.log('[ChatInput] WebSocket state changed:', {
        from: connectionState,
        to: state,
        sessionId,
        webSocketReadyState,
      });
    },
  });

  // State
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDeepGnosis, setIsDeepGnosis] = useState(false);
  const [sendAttempts, setSendAttempts] = useState(0);

  // Log connection state changes
  useEffect(() => {
    console.log('[ChatInput] Connection state update:', {
      connectionState,
      isConnected,
      isConnectionConfirmed,
      webSocketReadyState,
      wsStateName: webSocketReadyState === 1 ? 'OPEN' :
      webSocketReadyState === 0 ? 'CONNECTING' :
      webSocketReadyState === 2 ? 'CLOSING' :
      webSocketReadyState === 3 ? 'CLOSED' : 'UNKNOWN',
      sessionId,
    });

    // Show toast notifications for important state changes
    if (connectionState === 'error') {
      toast.error('Oracle connection lost. Attempting to reconnect...');
    } else if (connectionState === 'connected' && isConnected) {
      toast.success('Connected to Oracle', { duration: 2000 });
    } else if (connectionState === 'connecting') {
      toast.info('Connecting to Oracle...', { duration: 1000 });
    }
  }, [connectionState, isConnected, webSocketReadyState, isConnectionConfirmed, sessionId]);


  // Focus input when connected
  useEffect(() => {
    if (connectionState === 'connected' && isConnected && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 500);
    }
  }, [connectionState, isConnected]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Reset send attempts on new submission
    setSendAttempts(0);

    console.group('[ChatInput] 🚀 Submit Handler');
    console.log('Session ID:', sessionId);
    console.log('Input:', input);
    console.log('Input trimmed:', input.trim());
    console.log('Is listening:', isListening);
    console.log('Is streaming:', isStreaming);
    console.log('Connection state:', connectionState);
    console.log('WebSocket readyState:', webSocketReadyState);
<<<<<<< HEAD
=======
    console.log('WebSocket state name:', webSocketReadyState === 1 ? 'OPEN' :
    webSocketReadyState === 0 ? 'CONNECTING' :
    webSocketReadyState === 2 ? 'CLOSING' :
    webSocketReadyState === 3 ? 'CLOSED' : 'UNKNOWN');
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
    console.log('Is connected:', isConnected);
    console.log('Is connection confirmed:', isConnectionConfirmed);
    console.groupEnd();

    // Validation with specific error messages
    if (!sessionId) {
      console.error('[ChatInput] ❌ No session ID');
      toast.error('No active session');
      return;
    }

    if (!input.trim() && !isListening) {
      console.warn('[ChatInput] ⚠️ No input provided');
      toast.info('Please enter a message');
      return;
    }

    if (isStreaming) {
      console.warn('[ChatInput] ⚠️ Already streaming');
      toast.error('Please wait for current response');
      return;
    }

    if (connectionState !== 'connected' || !isConnected) {
      console.error('[ChatInput] ❌ Not connected to Oracle', {
        connectionState,
        isConnected,
        isConnectionConfirmed,
        webSocketReadyState,
      });
      toast.error('Not connected to Oracle. Please wait...');
<<<<<<< HEAD
=======

      // Attempt to reconnect
      if (connectionState === 'disconnected' || connectionState === 'error') {
        console.log('[ChatInput] Attempting to reconnect...');
        toast.info('Attempting to reconnect...');
        connect();
      }
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
      return;
    }

    const content = input.trim();
    console.log('[ChatInput] 📤 Sending message:', content.substring(0, 50) + '...');

    try {
      // Attempt to send message
      const success = await sendMessage(content);

      if (success) {
        console.log('[ChatInput] ✅ Message sent successfully');

        // Clear input
        setInput("");
        setAttachedFiles([]);
        setIsListening(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }

        // Call the callback
        if (onMessageSent) {
          console.log('[ChatInput] 📞 Calling onMessageSent callback');
          onMessageSent();
        }

        // Show success toast
        toast.success('Message sent to Oracle');

        // Focus back on input
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      } else {
        console.error('[ChatInput] ❌ Send returned false');
        toast.error('Failed to send message');
      }
    } catch (error: any) {
      console.error('[ChatInput] ❌ Error sending message:', error);

      // Increment send attempts
      setSendAttempts(prev => prev + 1);

      // Show user-friendly error message
      let errorMessage = error.message || "Failed to send message";

<<<<<<< HEAD
      if (error.message.includes('not connected')) {
=======
      if (error.message.includes('WebSocket not ready') || error.message.includes('state')) {
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
        errorMessage = 'Oracle connection not ready yet. Please wait...';
        // Auto-retry after delay if this is first attempt
  if (sendAttempts < 1) {
    setTimeout(() => {
      console.log('[ChatInput] 🔄 Auto-retrying send...');
      toast.info('Retrying send...');
      handleSubmit();
    }, 1000);
  }
<<<<<<< HEAD
=======
      } else if (error.message.includes('not confirmed')) {
        errorMessage = 'Waiting for Oracle confirmation...';
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
      }

      toast.error(errorMessage);
    }
  }, [input, isListening, isStreaming, connectionState, isConnected,
<<<<<<< HEAD
  sessionId, sendMessage, onMessageSent, webSocketReadyState,
=======
  sessionId, sendMessage, onMessageSent, connect, webSocketReadyState,
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
  isConnectionConfirmed, sendAttempts]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log('[ChatInput] ⌨️ Enter key pressed');
      handleSubmit();
    }

    // Ctrl/Cmd + Enter for deep gnosis mode
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      console.log('[ChatInput] ⌨️ Ctrl+Enter pressed, toggling Deep Gnosis');
      setIsDeepGnosis(!isDeepGnosis);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      console.log('[ChatInput] 📎 Files attached:', files.map(f => f.name));
      setAttachedFiles(files);
      toast.success(`Attached ${files.length} file${files.length > 1 ? 's' : ''}`);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(files => {
      const newFiles = [...files];
      const removed = newFiles.splice(index, 1);
      console.log('[ChatInput] 🗑️ Removed file:', removed[0]?.name);
      return newFiles;
    });
  };

  return (
    <div className={cn("p-8 pb-10 flex flex-col items-center relative z-40", className)}>
    {/* Connection Status Indicator */}
    <div className="mb-4">
    <ConnectionStatus state={connectionState} webSocketReadyState={webSocketReadyState} />
    </div>

    {/* File attachments preview */}
    {attachedFiles.length > 0 && (
      <div className="mb-4 flex flex-wrap gap-2 max-w-3xl w-full">
      {attachedFiles.map((file, index) => (
        <div
        key={index}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 text-xs"
        >
        <FileCode size={12} />
        <span className="truncate max-w-[150px]">{file.name}</span>
        <button
        type="button"
        onClick={() => removeFile(index)}
        className="text-cyan-300 hover:text-red-400 transition-colors"
        title="Remove file"
        >
        <X size={12} />
        </button>
        </div>
      ))}
      </div>
    )}

    {/* Deep Gnosis Toggle */}
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
      (isFocused || isStreaming || isListening) ? 'opacity-60 animate-pulse' : 'opacity-0 group-hover:opacity-30'
    )}
    />

    <div
    className={cn(
      "relative bg-[#080a0e] rounded-[2.5rem] border border-white/10 flex items-center p-2 shadow-2xl transition-all duration-300",
      isFocused && "border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)]",
                  isListening && "border-purple-500/50",
                  connectionState !== 'connected' && "border-red-500/30 opacity-80",
                  isStreaming && "border-emerald-500/30"
    )}
    >
    {/* Left Actions */}
    <div className="flex items-center gap-1 pl-4 pr-3 border-r border-white/5 h-10">
    <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className={cn(
      "p-2 rounded-full transition-all",
      attachedFiles.length > 0
      ? "text-cyan-400 bg-cyan-500/10"
      : "text-slate-500 hover:text-cyan-400 hover:bg-white/5"
    )}
    title="Inject Data Artifact"
    disabled={isStreaming || connectionState !== 'connected'}
    >
    {isDeepGnosis ? <FileCode size={20} className="text-amber-500" /> : <Paperclip size={20} />}
    </button>
    <input
    type="file"
    ref={fileInputRef}
    multiple
    className="hidden"
    onChange={handleFileChange}
    disabled={isStreaming || connectionState !== 'connected'}
    />

    <button
    type="button"
    onClick={() => setIsListening(!isListening)}
    className={cn(
      "p-2 rounded-full transition-all",
      isListening
      ? "text-red-500 bg-red-500/10 animate-pulse"
      : "text-slate-500 hover:text-purple-400 hover:bg-white/5",
      connectionState !== 'connected' && "opacity-50 cursor-not-allowed"
    )}
    title="Telepathic Voice Invocation"
    disabled={isStreaming || connectionState !== 'connected'}
    >
    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
    </div>

    {/* Input Field / Audio Vis */}
    <div className="flex-1 px-4 relative flex items-center min-h-[48px]">
    {isListening ? (
      <div className="w-full flex items-center justify-between">
      <span className="text-xs font-mono text-purple-400 animate-pulse tracking-widest">
      RECEIVING SIGNAL...
      </span>
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
      placeholder={
        connectionState === 'connecting'
        ? "Connecting to Oracle..."
        : connectionState !== 'connected'
        ? "Oracle disconnected. Reconnecting..."
        : isDeepGnosis
        ? "Deep Gnosis Active. Enter complex query... (Ctrl+Enter to toggle)"
        : "Ask the Oracle... (Ctrl+Enter for Deep Gnosis)"
      }
      className={cn(
        "w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-sans text-base transition-colors resize-none overflow-hidden py-3",
        isDeepGnosis && 'placeholder:text-amber-500/50',
        connectionState !== 'connected' && 'placeholder:text-red-400/50 cursor-not-allowed',
        isStreaming && 'placeholder:text-emerald-400/50'
      )}
      disabled={isStreaming || connectionState !== 'connected'}
      rows={1}
      />
    )}
    </div>

    {/* Send Button */}
    <button
    onClick={() => {
      console.log('[ChatInput] 🖱️ Send button clicked');
      handleSubmit();
    }}
    disabled={(!input.trim() && !isListening) || isStreaming || connectionState !== 'connected'}
    className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
      (input.trim() || isListening) && !isStreaming && connectionState === 'connected'
    ? `bg-${isDeepGnosis ? 'amber' : 'cyan'}-600 hover:bg-${isDeepGnosis ? 'amber' : 'cyan'}-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)] scale-100 cursor-pointer`
    : 'bg-white/5 text-slate-600 scale-90 cursor-not-allowed'
    )}
    title={connectionState !== 'connected' ? "Not connected to Oracle" : "Send message"}
    >
    {isStreaming ? (
      <Loader2 size={20} className="animate-spin" />
    ) : connectionState !== 'connected' ? (
      <WifiOff size={20} />
    ) : (
      <Send size={20} className={(input.trim() || isListening) ? "ml-0.5" : ""} />
    )}
    </button>
    </div>

    {/* Footer Status */}
    <div className="absolute top-full left-0 w-full text-center mt-4 opacity-60">
    <div className="flex items-center justify-center gap-3 text-[10px] text-cyan-500/60 font-mono tracking-[0.3em]">
    <Sparkles size={8} />
    <span>
    {connectionState === 'connecting'
      ? 'CONNECTING TO ORACLE...'
      : connectionState !== 'connected'
      ? 'ORACLE DISCONNECTED'
      : isStreaming
      ? 'ORACLE IS SPEAKING...'
      : isDeepGnosis
      ? 'DEEP GNOSIS ACTIVE'
  : 'THE ORACLE AWAITS YOUR QUERY'}
  </span>
  <Sparkles size={8} />
  </div>
  </div>
  </motion.div>

  {/* Keyboard Shortcuts Hint */}
  <div className="mt-6 text-xs text-slate-600 font-mono opacity-40">
  <div className="flex items-center gap-4">
  <span>Enter: Send</span>
  <span>Shift+Enter: New Line</span>
  <span>Ctrl+Enter: Toggle Deep Gnosis</span>
  </div>
  </div>
  </div>
  );
};

export default ChatInput;
