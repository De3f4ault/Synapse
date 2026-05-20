/**
 * ThinkingBlock — Collapsible reasoning/thinking display.
 *
 * Renders AI reasoning as a collapsible block with:
 * - "Thinking…" while the model is still in the thinking phase
 * - "Thought for Xs" once thinking ends (accurate timing via content refs)
 * - Dimmer content to distinguish from regular output
 *
 * Timing strategy:
 *   - Records `Date.now()` the first time `content` becomes non-empty.
 *   - Records `Date.now()` each render where content grows while streaming.
 *   - When `isStreaming` becomes false, freezes the duration using the last
 *     recorded grow time minus the first.
 *   - If the backend provides `durationSeconds` (from `data-thinking-duration`
 *     SSE part), that value takes precedence as it is more accurate.
 *
 * No setInterval tickers — timing is driven by actual content arrival.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";

interface ThinkingBlockProps {
  /** The thinking/reasoning content */
  content: string;
  /** Whether the AI is still streaming (thinking phase active) */
  isStreaming?: boolean;
  /**
   * Backend-measured thinking duration in seconds (from data-thinking-duration
   * SSE part). When present, takes precedence over the frontend-computed value.
   */
  durationSeconds?: number;
}

export function ThinkingBlock({
  content,
  isStreaming = false,
  durationSeconds,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(true);

  // ── Duration tracking ──────────────────────────────────────────────────────
  // Record timestamps as content grows, then freeze at stream end.
  const startTimeRef = useRef<number | null>(null);
  const lastGrowTimeRef = useRef<number | null>(null);
  const prevLengthRef = useRef<number>(0);
  const [computedDuration, setComputedDuration] = useState<number | null>(null);

  // Track content growth each render
  useEffect(() => {
    if (!content) return;
    const now = Date.now();
    if (startTimeRef.current === null) {
      // First time we see content — record start
      startTimeRef.current = now;
    }
    if (content.length > prevLengthRef.current) {
      // Content is still growing — update last-grow timestamp
      lastGrowTimeRef.current = now;
      prevLengthRef.current = content.length;
    }
  });

  // When streaming stops, freeze the computed duration
  useEffect(() => {
    if (!isStreaming && startTimeRef.current !== null && computedDuration === null) {
      const end = lastGrowTimeRef.current ?? Date.now();
      const elapsed = Math.round((end - startTimeRef.current) / 1000);
      setComputedDuration(elapsed);
    }
  }, [isStreaming, computedDuration]);

  // Backend value wins when present; otherwise fall back to frontend computation
  const effectiveDuration = durationSeconds ?? computedDuration;

  if (!content && !isStreaming) return null;

  // ── Label ──────────────────────────────────────────────────────────────────
  const stillThinking = isStreaming && effectiveDuration === null;
  const label = stillThinking
    ? "Thinking\u2026"
    : effectiveDuration !== null && effectiveDuration > 0
      ? `Thought for ${effectiveDuration}s`
      : "Thought";

  return (
    <div className="mb-3">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          "text-xs font-medium select-none",
          "hover:bg-muted/50",
          stillThinking ? "text-accent" : "text-muted-foreground",
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
                "text-[13px] leading-relaxed text-muted-foreground",
                stillThinking ? "border-accent/40" : "border-border",
              )}
            >
              <MarkdownRenderer content={content} className="opacity-70" />
              {stillThinking && (
                <span className="inline-flex gap-0.5 ml-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="inline-block w-1 h-1 rounded-full bg-accent"
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
