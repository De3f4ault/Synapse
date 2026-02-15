/**
 * ComparisonPanel — Side-by-side dual model response view
 *
 * Displays streaming responses from two AI models in parallel columns.
 * Inspired by Qwen's model comparison interface.
 * Uses MarkdownRenderer for formatted output.
 */

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";
import { useModels } from "../hooks/useModels";
import { cn } from "@/lib/utils";

export interface ComparisonPanelProps {
  /** Model A response content */
  contentA: string;
  /** Model B response content */
  contentB: string;
  /** Model A identifier (registry key) */
  modelA: string;
  /** Model B identifier (registry key) */
  modelB: string;
  /** Is Model A still streaming? */
  isStreamingA: boolean;
  /** Is Model B still streaming? */
  isStreamingB: boolean;
  /** Model A thinking content (optional) */
  thinkingA?: string;
  /** Model B thinking content (optional) */
  thinkingB?: string;
}

function ColumnHeader({
  modelId,
  isStreaming,
}: {
  modelId: string;
  isStreaming: boolean;
}) {
  const { models } = useModels();
  const info = models.find((m) => m.id === modelId);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-semibold text-white">
          {info?.name || modelId}
        </span>
        {info?.provider && (
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium",
              info.provider === "ollama"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-blue-500/15 text-blue-400"
            )}
          >
            {info.provider}
          </span>
        )}
        {info?.supportsThinking && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-medium">
            Thinking
          </span>
        )}
      </div>
      {isStreaming && (
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Loader2 className="size-3 animate-spin" />
          <span className="text-[11px]">Generating…</span>
        </div>
      )}
    </header>
  );
}

function ResponseColumn({
  modelId,
  content,
  isStreaming,
}: {
  modelId: string;
  content: string;
  isStreaming: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-white/6 bg-[#0a0a0c]/80 backdrop-blur-xl overflow-hidden">
      <ColumnHeader modelId={modelId} isStreaming={isStreaming} />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-hide"
      >
        {content ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[120px] text-zinc-500 text-sm">
            {isStreaming ? "Waiting for response…" : "No response yet"}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComparisonPanel({
  contentA,
  contentB,
  modelA,
  modelB,
  isStreamingA,
  isStreamingB,
}: ComparisonPanelProps) {
  return (
    <div className="flex gap-3 w-full mb-4 min-h-[200px] max-h-[60vh]">
      <ResponseColumn
        modelId={modelA}
        content={contentA}
        isStreaming={isStreamingA}
      />
      <ResponseColumn
        modelId={modelB}
        content={contentB}
        isStreaming={isStreamingB}
      />
    </div>
  );
}

export default ComparisonPanel;
