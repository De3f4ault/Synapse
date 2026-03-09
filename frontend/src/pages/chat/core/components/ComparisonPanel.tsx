/**
 * ComparisonPanel — Side-by-side dual model response view
 *
 * Displays streaming responses from two AI models in parallel columns.
 * Renders INSIDE the scrollable chat message area (like Qwen).
 * Uses MarkdownRenderer for formatted output.
 * Each column has Copy + Regenerate action buttons inline after the AI content.
 */

import { useState } from "react";
import { Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";
import { useModels } from "../hooks/useModels";
import { ThinkingBlock } from "./ThinkingBlock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ComparisonPanelProps {
  contentA: string;
  contentB: string;
  modelA: string;
  modelB: string;
  isStreamingA: boolean;
  isStreamingB: boolean;
  thinkingA?: string;
  thinkingB?: string;
}

function ColumnHeader({
  modelId,
  isStreaming,
  slot,
}: {
  modelId: string;
  isStreaming: boolean;
  slot: "A" | "B";
}) {
  const { models } = useModels();
  const info = models.find((m) => m.id === modelId);

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold",
            slot === "A"
              ? "bg-cyan-500/20 text-cyan-400"
              : "bg-amber-500/20 text-amber-400",
          )}
        >
          {slot}
        </span>
        <span className="text-[13px] font-semibold text-white">
          {info?.name || modelId}
        </span>
        {info?.provider && (
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium",
              info.provider === "ollama"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-blue-500/15 text-blue-400",
            )}
          >
            {info.provider}
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

/**
 * Inline action buttons directly after AI content (Copy + Regenerate only)
 */
function InlineActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex items-center gap-0.5 mt-3 pt-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        title="Regenerate"
      >
        <RefreshCw className="size-3" />
        <span>Regenerate</span>
      </button>
    </div>
  );
}

function ResponseColumn({
  modelId,
  content,
  isStreaming,
  thinking,
  slot,
}: {
  modelId: string;
  content: string;
  isStreaming: boolean;
  thinking?: string;
  slot: "A" | "B";
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-white/6 bg-[#0a0a0c]/80 backdrop-blur-xl overflow-hidden">
      <ColumnHeader modelId={modelId} isStreaming={isStreaming} slot={slot} />
      <div className="p-4">
        {/* Thinking block */}
        {thinking && (
          <ThinkingBlock content={thinking} isStreaming={isStreaming} />
        )}

        {/* Response content */}
        {content ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[80px] text-zinc-500 text-sm">
            {isStreaming ? "Waiting for response…" : "No response yet"}
          </div>
        )}

        {/* Action buttons — inline directly after content */}
        {content && !isStreaming && (
          <InlineActions content={content} />
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
  thinkingA,
  thinkingB,
}: ComparisonPanelProps) {
  return (
    <div className="flex gap-3 w-full">
      <ResponseColumn
        modelId={modelA}
        content={contentA}
        isStreaming={isStreamingA}
        thinking={thinkingA}
        slot="A"
      />
      <div className="w-px bg-white/5 self-stretch shrink-0" />
      <ResponseColumn
        modelId={modelB}
        content={contentB}
        isStreaming={isStreamingB}
        thinking={thinkingB}
        slot="B"
      />
    </div>
  );
}

export default ComparisonPanel;
