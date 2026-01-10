import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Enhanced StreamingMessage Component
 *
 * Improvements per documentation:
 * - Token-by-token animation effect
 * - Animated blinking cursor
 * - Smooth typing indicator with bounce
 * - Better visual feedback during streaming
 */

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/**
 * Displays a message with streaming animation.
 * Shows an animated cursor while streaming is in progress.
 */
export function StreamingMessage({
  content,
  isStreaming,
  className,
}: StreamingMessageProps) {
  return (
    <div
      className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}
    >
      {content}
      {isStreaming && (
        <motion.span
          className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle"
          animate={{
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}

/**
 * Typing indicator shown while AI is thinking.
 * Three animated dots with staggered bounce effect.
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-muted-foreground"
          animate={{
            y: [0, -8, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Message bubble with streaming support.
 * Provides consistent styling for messages with animation.
 */
interface MessageBubbleProps {
  content: string;
  isStreaming?: boolean;
  isUser: boolean;
  className?: string;
}

export function MessageBubble({
  content,
  isStreaming = false,
  isUser,
  className,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2 shadow-sm",
        isUser
          ? "ml-auto bg-primary text-primary-foreground"
          : "mr-auto bg-muted",
        className,
      )}
    >
      <StreamingMessage
        content={content}
        isStreaming={isStreaming && !isUser}
      />
    </motion.div>
  );
}

/**
 * Loading dots animation for initial connection state.
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  );
}

export default StreamingMessage;
