/**
 * ArtifactPanel - Inline side panel for expanded artifact view
 *
 * Claude-style layout: shares canvas with chat, no overlay.
 * Features:
 * - Inline side-by-side with chat
 * - Resizable with drag handle (turns blue on hover)
 * - Full code view with syntax highlighting
 * - Live React preview using Sandpack
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Copy, Download, Code, ChevronLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { useArtifactStore } from "../state/artifactStore";
import { ReactArtifactPreview } from "./ReactArtifactPreview";
import { CodeView } from "./CodeView";
import { MarkdownRenderer } from "@/shared/rendering/MarkdownRenderer";
import "./ArtifactPanel.css";

export function ArtifactPanel() {
  const { activeArtifact, isPanelOpen, panelWidth, closePanel, setPanelWidth } =
    useArtifactStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Handle resize with mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(320, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setPanelWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Download file
  const handleDownload = () => {
    if (!activeArtifact) return;

    const extension =
      {
        typescript: "ts",
        javascript: "js",
        python: "py",
        tsx: "tsx",
        jsx: "jsx",
        html: "html",
        css: "css",
      }[activeArtifact.language || ""] || "txt";

    const filename =
      activeArtifact.filename ||
      `${activeArtifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;

    const blob = new Blob([activeArtifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${filename}`);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen) {
        closePanel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen || !activeArtifact) return null;

  const isReactArtifact = activeArtifact.artifactType === "application/vnd.ant.react";
  const isMarkdownArtifact = activeArtifact.artifactType === "text/markdown";
  const lineCount = activeArtifact.content.split("\n").length;
  const HeaderIcon = isMarkdownArtifact ? FileText : Code;

  return (
    <div
      ref={panelRef}
      className="artifact-panel-inline"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Resize handle - LEFT EDGE */}
      <div
        className={`artifact-resize-handle ${isResizing ? "active" : ""}`}
        onMouseDown={startResize}
      >
        <div className="resize-indicator" />
      </div>

      {/* Header */}
      <div className="artifact-panel-header">
        <button onClick={closePanel} className="collapse-btn" title="Close panel">
          <ChevronLeft className="size-4" />
        </button>
        
        <div className="artifact-panel-title">
          <HeaderIcon className="size-4 text-cyan-400" />
          <span>{activeArtifact.title}</span>
        </div>
        
        <div className="artifact-panel-meta">
          <span>{lineCount} lines</span>
          {activeArtifact.language && <span>• {activeArtifact.language}</span>}
        </div>
        
        <div className="artifact-panel-actions">
          <button onClick={handleCopy} title="Copy">
            <Copy className="size-4" />
          </button>
          <button onClick={handleDownload} title="Download">
            <Download className="size-4" />
          </button>
          <button onClick={closePanel} title="Close" className="close-btn">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="artifact-panel-content">
        {isReactArtifact ? (
          <ReactArtifactPreview
            artifact={activeArtifact}
            height="100%"
            showEditor
            onFixWithAI={(code, error) => {
              console.log("Fix with AI:", { code, error });
              toast.info("AI fix coming soon!");
            }}
          />
        ) : isMarkdownArtifact ? (
          <div className="artifact-panel-markdown">
            <MarkdownRenderer content={activeArtifact.content} />
          </div>
        ) : (
          <CodeView 
            code={activeArtifact.content} 
            language={activeArtifact.language || "typescript"}
            showLineNumbers
          />
        )}
      </div>
    </div>
  );
}

export default ArtifactPanel;
