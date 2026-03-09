/**
 * ThinkingBlock — DeepSeek-style collapsible inline thinking display
 *
 * Shows AI reasoning/thinking in a collapsible block with:
 * - "Thought for X seconds ▾" toggle header
 * - Dimmer content to distinguish from regular output
 * - Auto-expanded while streaming, collapses when complete
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";

interface ThinkingBlockProps {
  /** The thinking/reasoning content */
  content: string;
  /** Whether the AI is still streaming thinking */
  isStreaming?: boolean;
}

export function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Track elapsed seconds while streaming
  useEffect(() => {
    if (!isStreaming) return;
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Freeze elapsed time when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, [isStreaming]);

  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming && content) {
      const timer = setTimeout(() => setIsOpen(false), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isStreaming, content]);

  if (!content && !isStreaming) return null;

  const label = isStreaming
    ? `Thinking${elapsed > 0 ? ` for ${elapsed}s` : "…"}`
    : `Thought for ${elapsed || "< 1"}s`;

  return (
    <div className="mb-3">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          "text-xs font-medium select-none",
          "hover:bg-white/5",
          isStreaming
            ? "text-purple-400"
            : "text-zinc-500",
        )}
      >
        <Brain className="size-3.5" />
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-3 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "ml-3 pl-3 border-l-2 mt-1",
                "text-[13px] leading-relaxed text-zinc-500",
                isStreaming
                  ? "border-purple-500/40"
                  : "border-zinc-700/50",
              )}
            >
              <MarkdownRenderer content={content} className="opacity-70" />
              {isStreaming && (
                <span className="inline-flex gap-0.5 ml-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="inline-block w-1 h-1 rounded-full bg-purple-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThinkingBlock;

