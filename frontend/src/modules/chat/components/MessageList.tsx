import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StreamingMessage, TypingIndicator } from './StreamingMessage';
import { cn, formatRelativeTime, getInitials } from '@/lib/utils';
import { Bot, User, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { ChatMessageResponse } from '@/api/generated';

/**
 * Enhanced MessageList Component
 *
 * Improvements per documentation:
 * - Auto-scroll to bottom on new messages
 * - Markdown rendering support (ready for integration)
 * - Message actions (copy, regenerate)
 * - Stagger animation for message entry
 * - Better empty state
 * - Improved loading states
 * - Smooth scroll behavior
 */

interface MessageListProps {
    messages: ChatMessageResponse[];
    streamingContent?: string;
    isStreaming?: boolean;
    isLoading?: boolean;
    isTyping?: boolean;
    userName?: string;
    className?: string;
}

interface MessageItemProps {
    message: ChatMessageResponse;
    userName?: string;
    isStreaming?: boolean;
    index?: number;
}

function MessageItem({ message, userName, isStreaming = false, index = 0 }: MessageItemProps) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            toast({ title: 'Copied to clipboard', duration: 2000 });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: 'Failed to copy',
                variant: 'destructive',
            });
        }
    };

    return (
        <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
            duration: 0.3,
            delay: index * 0.05,
            ease: 'easeOut',
        }}
        className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
        >
        {/* Avatar */}
        <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 200 }}
        >
        <Avatar
        className={cn(
            'h-8 w-8 shrink-0 ring-2 ring-background',
            isUser && 'bg-primary'
        )}
        >
        <AvatarFallback
        className={cn(isUser && 'bg-primary text-primary-foreground')}
        >
        {isUser ? (
            userName ? (
                getInitials(userName, 1)
            ) : (
                <User className="h-4 w-4" />
            )
        ) : (
            <Bot className="h-4 w-4" />
        )}
        </AvatarFallback>
        </Avatar>
        </motion.div>

        {/* Message content */}
        <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        <motion.div
        className={cn(
            'rounded-2xl px-4 py-2 shadow-sm',
            isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        >
        {isStreaming && !isUser ? (
            <StreamingMessage content={message.content} isStreaming />
        ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
            </p>
        )}
        </motion.div>

        {/* Message metadata */}
        <div className={cn('flex items-center gap-2 px-1', isUser && 'flex-row-reverse')}>
        <span className="text-xs text-muted-foreground">
        {formatRelativeTime(message.created_at)}
        </span>

        {/* Message actions (visible on hover) */}
        {!isUser && (
            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
            <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            >
            {copied ? (
                <Check className="h-3 w-3 text-green-500" />
            ) : (
                <Copy className="h-3 w-3" />
            )}
            </Button>
            {/* TODO: Add regenerate button */}
            </motion.div>
        )}
        </div>
        </div>
        </motion.div>
    );
}

function MessageSkeleton() {
    return (
        <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        </div>
        </div>
    );
}

export function MessageList({
    messages,
    streamingContent,
    isStreaming = false,
    isLoading = false,
    isTyping = false,
    userName,
    className,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages or streaming content
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, streamingContent, isStreaming]);

    if (isLoading) {
        return (
            <ScrollArea className={cn('flex-1 p-4', className)}>
            <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <MessageSkeleton key={i} />
            ))}
            </div>
            </ScrollArea>
        );
    }

    if (messages.length === 0 && !streamingContent && !isTyping) {
        return (
            <div className={cn('flex flex-1 items-center justify-center p-4', className)}>
            <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md"
            >
            <motion.div
            animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
            }}
            transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
            >
            <Bot className="mx-auto h-16 w-16 text-primary mb-4" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground">
            Ask me anything about your study materials, and I'll help you learn better.
            </p>
            </motion.div>
            </div>
        );
    }

    return (
        <ScrollArea className={cn('flex-1', className)} ref={scrollRef}>
        <div className="space-y-6 p-4">
        <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
            <MessageItem
            key={message.id}
            message={message}
            userName={userName}
            isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === 'assistant'
            }
            index={index}
            />
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
            <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
            >
            <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>
            <Bot className="h-4 w-4" />
            </AvatarFallback>
            </Avatar>
            <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 shadow-sm">
            <StreamingMessage content={streamingContent} isStreaming />
            </div>
            </motion.div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
            <motion.div
            key="typing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
            >
            <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>
            <Bot className="h-4 w-4" />
            </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl bg-muted px-4 py-3 shadow-sm">
            <TypingIndicator />
            </div>
            </motion.div>
        )}
        </AnimatePresence>

        <div ref={bottomRef} />
        </div>
        </ScrollArea>
    );
}

export default MessageList;
