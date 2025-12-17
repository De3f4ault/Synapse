import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Send, Loader2, Plus } from 'lucide-react';

/**
 * MessageInput - DeepSeek Style
 * Clean, minimal input component with attachment toggle
 */

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
    maxLength?: number;
}

export function MessageInput({
    onSend,
    disabled = false,
    isLoading = false,
    placeholder = 'Message Synapse...',
    className,
    maxLength = 4000,
}: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        const trimmed = message.trim();
        if (!trimmed || disabled || isLoading) return;

        onSend(trimmed);
        setMessage('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [message, disabled, isLoading, onSend]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

    const charCount = message.length;
    const isOverLimit = charCount > maxLength;
    const canSend = message.trim().length > 0 && !isOverLimit && !disabled && !isLoading;

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "relative rounded-2xl border transition-all duration-200 overflow-hidden flex items-end bg-[#1a1a1a]",
                    isFocused
                        ? "border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                        : "border-white/10 hover:border-white/15"
                )}
            >
                {/* Attachment Button (DeepSeek Style) */}
                <div className="pb-3 pl-3">
                    <button
                        className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Upload file (coming soon)"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>

                {/* Textarea */}
                <textarea
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
                        "flex-1 w-full resize-none bg-transparent px-3 py-4 text-[var(--synapse-text-primary)] placeholder:text-[var(--synapse-text-tertiary)]",
                        "focus:outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "max-h-[200px] min-h-[52px] leading-relaxed text-[15px]"
                    )}
                />

                {/* Send button */}
                <div className="pb-3 pr-3">
                    <motion.button
                        whileHover={canSend ? { scale: 1.05 } : {}}
                        whileTap={canSend ? { scale: 0.95 } : {}}
                        onClick={handleSend}
                        disabled={!canSend}
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                            canSend
                                ? "bg-[var(--synapse-cyan)] text-black"
                                : "bg-white/10 text-white/20 cursor-not-allowed"
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
                                    <Loader2 className="h-4 w-4" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="send"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Send className="h-4 w-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

export default MessageInput;
