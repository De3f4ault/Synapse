import { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Loader2, Sparkles, Keyboard } from 'lucide-react';

/**
 * Enhanced MessageInput Component
 *
 * Improvements per documentation:
 * - Multi-line textarea with auto-resize
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Character count with visual feedback
 * - Animated send button states
 * - Suggestions when empty
 * - Better disabled/loading states
 * - Smooth focus animations
 */

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
    maxLength?: number;
}

const SUGGESTIONS = [
    'Explain this concept...',
    'Quiz me on...',
    'Summarize the key points...',
    'Create flashcards for...',
];

export function MessageInput({
    onSend,
    disabled = false,
    isLoading = false,
    placeholder = 'Ask me anything about your study materials...',
    className,
    maxLength = 4000,
}: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        const trimmed = message.trim();
        if (!trimmed || disabled || isLoading) return;

        onSend(trimmed);
        setMessage('');
        setShowSuggestions(false);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [message, disabled, isLoading, onSend]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            // Send on Enter (without Shift)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleInput = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, []);

    const handleSuggestionClick = useCallback((suggestion: string) => {
        setMessage(suggestion);
        setShowSuggestions(false);
        textareaRef.current?.focus();
    }, []);

    // Show suggestions when focused and empty
    useEffect(() => {
        setShowSuggestions(isFocused && message.length === 0);
    }, [isFocused, message]);

    const charCount = message.length;
    const isOverLimit = charCount > maxLength;
    const canSend = message.trim().length > 0 && !isOverLimit && !disabled && !isLoading;
    const showCharCount = charCount > maxLength * 0.8;

    return (
        <div className={cn("w-full relative", className)}>
            {/* Suggestions */}
            <AnimatePresence>
                {showSuggestions && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: 10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--synapse-text-tertiary)] uppercase tracking-wider font-bold px-1">
                            <Sparkles className="h-3 w-3 text-[var(--synapse-cyan)]" />
                            <span>Suggested Actions</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTIONS.map((suggestion, index) => (
                                <motion.button
                                    key={suggestion}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-[var(--synapse-text-secondary)] hover:text-white hover:border-[var(--synapse-cyan)]/50 transition-all shadow-sm backdrop-blur-sm"
                                >
                                    {suggestion}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Container */}
            <motion.div
                className={cn(
                    "relative rounded-2xl border transition-all duration-300 overflow-hidden",
                    isFocused
                        ? "bg-black/40 border-[var(--synapse-cyan)] shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "bg-black/20 border-white/10 hover:border-white/20 hover:bg-black/30"
                )}
                animate={{
                    borderColor: isFocused ? 'var(--synapse-cyan)' : 'rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Textarea */}
                <div className="relative">
                    <motion.textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        disabled={disabled || isLoading}
                        rows={1}
                        maxLength={maxLength}
                        className={cn(
                            "w-full resize-none bg-transparent px-5 py-4 pr-14 text-[var(--synapse-text-primary)] placeholder:text-[var(--synapse-text-tertiary)]",
                            "focus:outline-none transition-all",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "max-h-[200px] min-h-[56px] leading-relaxed"
                        )}
                    />

                    {/* Character count */}
                    <AnimatePresence>
                        {showCharCount && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={cn(
                                    "absolute bottom-4 right-16 text-xs font-mono font-medium bg-black/50 px-2 py-0.5 rounded",
                                    isOverLimit ? "text-red-500" : "text-[var(--synapse-text-tertiary)]"
                                )}
                            >
                                {charCount}/{maxLength}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Send button */}
                    <div className="absolute right-2 bottom-2">
                        <motion.button
                            whileHover={canSend ? { scale: 1.1 } : {}}
                            whileTap={canSend ? { scale: 0.9 } : {}}
                            onClick={handleSend}
                            disabled={!canSend}
                            className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                                canSend
                                    ? "bg-[var(--synapse-cyan)] text-black shadow-[0_0_15px_var(--synapse-cyan)] opacity-100"
                                    : "bg-white/5 text-white/20 opacity-50 cursor-not-allowed"
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ rotate: 0 }}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Loader2 className="h-5 w-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="send"
                                        initial={{ x: -2, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                    >
                                        <Send className="h-5 w-5 ml-0.5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </div>

                {/* Bottom Bar: Hints & Tools (Future Proofing) */}
                <AnimatePresence>
                    {isFocused && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 border-t border-white/5 px-4 py-2 flex items-center justify-between text-[10px] text-[var(--synapse-text-tertiary)]"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5">
                                    <Keyboard className="h-3 w-3 opacity-50" />
                                    <span><strong>Enter</strong> to send</span>
                                </span>
                                <span className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                                    <span><strong>Shift+Enter</strong> for newline</span>
                                </span>
                            </div>

                            {/* Potential spot for attachment buttons or mode toggles */}
                            <div className="flex items-center gap-2">
                                {/* Placeholders for future tools */}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

export default MessageInput;
