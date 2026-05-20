/**
 * StreamingStatus — Tiered wait-time indicator for AI responses.
 *
 * Replaces the simple blinking cursor with contextual messages that
 * evolve based on how long the user has been waiting:
 *
 *   0–5s:   silent, just the cursor blink
 *   5–15s:  "Working on this..."
 *   15–30s: "This one needs a moment to think..."
 *   30s+:   "Switching models, almost there..."
 *
 * These thresholds are intentionally aligned with the LiteLLM router's
 * timeout windows so the messaging corresponds to what's actually
 * happening in the pipeline (model warm-up → timeout → failover).
 *
 * Usage:
 *   {isStreaming && <StreamingStatus hasContent={textLength > 0} />}
 */

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface StreamingStatusProps {
  /**
   * Whether any visible content (text or reasoning) has arrived yet.
   * Once content starts flowing, we drop back to the simple cursor.
   */
  hasContent: boolean;
}

// ── Tiered messages ──────────────────────────────────────────────────────────
// Each tier is [delayMs, message]. The delay is from the start of waiting.
// Once content arrives (hasContent=true), we immediately switch to cursor-only.

const TIERS: [number, string][] = [
  [5_000,  "Working on this…"],
  [15_000, "This one needs a moment to think…"],
  [30_000, "Switching models, almost there…"],
];

export function StreamingStatus({ hasContent }: StreamingStatusProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Start tiered timers when we begin waiting (hasContent=false).
  // Clean up immediately when content arrives or component unmounts.
  useEffect(() => {
    if (hasContent) {
      // Content has arrived — clear everything, show cursor only
      setStatusMessage(null);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      return;
    }

    // Schedule each tier's message
    timersRef.current = TIERS.map(([delayMs, message]) =>
      setTimeout(() => setStatusMessage(message), delayMs),
    );

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [hasContent]);

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* Animated cursor — always visible during streaming */}
      <div className="h-4 w-1 bg-primary animate-pulse rounded-full" />

      {/* Tiered status message — fades in when a threshold is crossed */}
      <AnimatePresence mode="wait">
        {statusMessage && !hasContent && (
          <motion.span
            key={statusMessage}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-muted-foreground italic"
          >
            {statusMessage}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
