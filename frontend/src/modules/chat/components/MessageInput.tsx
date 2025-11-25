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
        <div className={cn('border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
        {/* Suggestions */}
        <AnimatePresence>
        {showSuggestions && !isLoading && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="border-b px-4 py-3"
            >
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion, index) => (
                <motion.button
                key={suggestion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="rounded-full bg-muted px-3 py-1.5 text-xs hover:bg-muted/80 transition-colors"
                >
                {suggestion}
                </motion.button>
            ))}
            </div>
            </motion.div>
        )}
        </AnimatePresence>

        {/* Input area */}
        <div className="p-4">
        <div className="flex items-end gap-2">
        <div className="relative flex-1">
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
            'w-full resize-none rounded-lg border bg-background px-4 py-3 pr-12',
            'focus:outline-none focus:ring-2 focus:ring-primary transition-all',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'max-h-[200px] min-h-[48px]',
            isOverLimit && 'border-destructive focus:ring-destructive'
        )}
        animate={{
            borderColor: isFocused
            ? 'hsl(var(--primary))'
            : 'hsl(var(--border))',
        }}
        transition={{ duration: 0.2 }}
        />
        {/* Character count */}
        <AnimatePresence>
        {showCharCount && (
            <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'absolute bottom-2 right-16 text-xs font-medium',
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
            >
            {charCount}/{maxLength}
            </motion.span>
        )}
        </AnimatePresence>
        </div>

        {/* Send button with animation */}
        <motion.div
        whileHover={canSend ? { scale: 1.05 } : {}}
        whileTap={canSend ? { scale: 0.95 } : {}}
        >
        <Button
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className="h-12 w-12 shrink-0 transition-all"
        >
        <AnimatePresence mode="wait">
        {isLoading ? (
            <motion.div
            key="loading"
            initial={{ opacity: 0, rotate: -180 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 180 }}
            transition={{ duration: 0.2 }}
            >
            <Loader2 className="h-5 w-5 animate-spin" />
            </motion.div>
        ) : (
            <motion.div
            key="send"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            >
            <Send className="h-5 w-5" />
            </motion.div>
        )}
        </AnimatePresence>
        </Button>
        </motion.div>
        </div>

        {/* Keyboard shortcuts hint */}
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isFocused ? 1 : 0.5 }}
        transition={{ duration: 0.2 }}
        className="mt-2 flex items-center gap-4 text-xs text-muted-foreground"
        >
        <span className="flex items-center gap-1">
        <Keyboard className="h-3 w-3" />
        Press Enter to send
        </span>
        <span>Shift+Enter for new line</span>
        </motion.div>
        </div>
        </div>
    );
}

export default MessageInput;
