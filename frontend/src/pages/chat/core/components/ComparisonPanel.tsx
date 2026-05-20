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
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold",
            slot === "A"
              ? "bg-primary/20 text-primary"
              : "bg-warning/20 text-warning",
          )}
        >
          {slot}
        </span>
        <span className="text-[13px] font-semibold text-foreground">
          {info?.name || modelId}
        </span>
        {info?.provider && (
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium",
              info.provider === "ollama"
                ? "bg-accent-olive/15 text-accent-olive"
                : "bg-blue-500/15 text-info",
            )}
          >
            {info.provider}
          </span>
        )}
      </div>
      {isStreaming && (
        <div className="flex items-center gap-1.5 text-primary">
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
        className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground/70 hover:bg-muted/50 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="size-3 text-accent-olive" /> : <Copy className="size-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground/70 hover:bg-muted/50 transition-colors"
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
    <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden">
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
          <div className="flex items-center justify-center min-h-[80px] text-muted-foreground text-sm">
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
      <div className="w-px bg-foreground/5 self-stretch shrink-0" />
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
