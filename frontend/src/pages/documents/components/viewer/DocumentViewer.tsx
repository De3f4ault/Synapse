import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRight,
  Sparkles,
  FileText,
  StickyNote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/authStore";
import type { EnhancedDocument } from "../../types/documents.types";

// Light viewers (small bundle size) - static imports
import { TextViewer } from "./TextViewer";
import { ThemeSelector, type ViewerTheme } from "./ThemeSelector";

// Heavy viewers - lazy loaded for code splitting
const PDFViewer = lazy(() => import("./PDFViewer").then(m => ({ default: m.PDFViewer })));
const MarkdownViewer = lazy(() => import("./MarkdownViewer").then(m => ({ default: m.MarkdownViewer })));
const EPUBViewer = lazy(() => import("./EPUBViewer").then(m => ({ default: m.EPUBViewer })));
const HTMLViewer = lazy(() => import("./HTMLViewer").then(m => ({ default: m.HTMLViewer })));
const DOCXViewer = lazy(() => import("./DOCXViewer").then(m => ({ default: m.DOCXViewer })));
const SpreadsheetViewer = lazy(() => import("./SpreadsheetViewer").then(m => ({ default: m.SpreadsheetViewer })));

// Type import for PDFTheme
type PDFTheme = "light" | "sepia" | "twilight" | "dark";

// Loading fallback component
const ViewerLoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-black/40">
    <div className="text-center">
      <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={32} />
      <p className="text-slate-400 text-sm">Loading viewer...</p>
    </div>
  </div>
);

interface DocumentViewerProps {
  doc: EnhancedDocument;
  docs?: EnhancedDocument[]; // For navigation
  onClose: () => void;
  onDelete: () => void;
  onNavigate?: (doc: EnhancedDocument) => void;
  logAction: (msg: string) => void;
}

/**
 * FileIcon Component
 */
const FileIcon: React.FC<{ type: string; className?: string }> = ({
  type: _type,
  className,
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

/**
 * Format file size to human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Enhanced DocumentViewer with keyboard shortcuts, collapsible panel, notes, and AI summary
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  doc,
  docs = [],
  onClose,
  onDelete,
  onNavigate,
  logAction,
}) => {
  const token = useAuthStore((state) => state.token);

  // UI State
  const [showMetadata, setShowMetadata] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readingProgress = doc.reading_progress || 0;

  // Theme State (persisted to localStorage)
  const [theme, setTheme] = useState<ViewerTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('viewer-theme') as ViewerTheme) || 'dark';
    }
    return 'dark';
  });

  const handleThemeChange = (newTheme: ViewerTheme) => {
    setTheme(newTheme);
    localStorage.setItem('viewer-theme', newTheme);
  };

  // Notes State
  const [notes, setNotes] = useState(doc.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);

  // AI Summary State
  const [summary, setSummary] = useState(doc.ai_summary || "");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Get current doc index for navigation
  const currentIndex = docs.findIndex((d) => d.id === doc.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < docs.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in textarea
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "m":
        case "M":
          setShowMetadata((prev) => !prev);
          break;
        case "f":
        case "F":
          setIsFullscreen((prev) => !prev);
          break;
        case "ArrowLeft":
          {
            const prevDoc = docs[currentIndex - 1];
            if (hasPrev && onNavigate && prevDoc) {
              onNavigate(prevDoc);
            }
          }
          break;
        case "ArrowRight":
          {
            const nextDoc = docs[currentIndex + 1];
            if (hasNext && onNavigate && nextDoc) {
              onNavigate(nextDoc);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hasPrev, hasNext, onNavigate, docs, currentIndex]);

  // Save notes to backend
  const saveNotes = useCallback(async () => {
    setNotesSaving(true);
    try {
      await fetch(`/api/v1/documents/${doc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setNotesSaving(false);
    }
  }, [doc.id, notes, token]);

  // Debounced notes save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== doc.notes) saveNotes();
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, doc.notes, saveNotes]);

  // Generate AI Summary
  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/v1/documents/${doc.id}/summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300";
      case "processing":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 animate-pulse";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Reading Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-[60]">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${readingProgress * 100}%` }}
        />
      </div>

      {/* Modal */}
      <motion.div
        className={`relative bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex pointer-events-auto transition-all duration-300 ${isFullscreen
          ? "w-full h-full rounded-none"
          : "w-full max-w-6xl h-[85vh]"
          }`}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/60 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-cyan-400" />
            <span
              className="text-sm font-medium text-white truncate max-w-[200px]"
              title={doc.filename}
            >
              {doc.filename}
            </span>
            {notes && (
              <span title="Has notes">
                <StickyNote size={14} className="text-yellow-400" />
              </span>
            )}
            <div className="w-px h-4 bg-white/20 mx-1" />
            <ThemeSelector theme={theme} onThemeChange={handleThemeChange} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Navigation */}
            {docs.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const prevDoc = docs[currentIndex - 1];
                    if (hasPrev && onNavigate && prevDoc) onNavigate(prevDoc);
                  }}
                  disabled={!hasPrev}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                  title="Previous (←)"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-slate-500 px-2">
                  {currentIndex + 1}/{docs.length}
                </span>
                <button
                  onClick={() => {
                    const nextDoc = docs[currentIndex + 1];
                    if (hasNext && onNavigate && nextDoc) onNavigate(nextDoc);
                  }}
                  disabled={!hasNext}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                  title="Next (→)"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-2" />
              </>
            )}

            <button
              onClick={() => setShowMetadata((prev) => !prev)}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Toggle panel (M)"
            >
              {showMetadata ? (
                <PanelRightClose size={18} />
              ) : (
                <PanelRight size={18} />
              )}
            </button>
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex w-full h-full pt-14">
          {/* Left: Preview */}
          <div
            className={`h-full relative bg-black/40 transition-all duration-300 ${showMetadata ? "w-full md:w-2/3" : "w-full"
              }`}
          >
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Loading */}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <Loader2 className="animate-spin text-cyan-500" />
            </div>

            {/* Render the appropriate viewer based on document type */}
            <Suspense fallback={<ViewerLoadingFallback />}>
              {(() => {
                const type = doc.type.toLowerCase();
                const contentUrl = `/api/v1/documents/${doc.id}/content?token=${token}`;

                // PDF files
                if (type === 'pdf') {
                  return <PDFViewer url={contentUrl} theme={theme as PDFTheme} />;
                }

                // Markdown files
                if (type === 'md' || type === 'markdown') {
                  return (
                    <MarkdownViewer
                      content={doc.content_text || 'No content extracted yet'}
                      theme={theme}
                    />
                  );
                }

                // Text files
                if (type === 'txt' || type === 'text') {
                  return (
                    <TextViewer
                      content={doc.content_text || 'No content extracted yet'}
                      theme={theme}
                    />
                  );
                }

                // EPUB files
                if (type === 'epub') {
                  return <EPUBViewer url={contentUrl} theme={theme} />;
                }

                // HTML files
                if (type === 'html' || type === 'htm') {
                  return (
                    <HTMLViewer
                      content={doc.content_text || '<p>No content extracted yet</p>'}
                      theme={theme}
                    />
                  );
                }

                // DOCX/DOC files
                if (type === 'docx' || type === 'doc') {
                  return <DOCXViewer url={contentUrl} theme={theme} />;
                }

                // Spreadsheet files (CSV, XLSX, XLS)
                if (['csv', 'xlsx', 'xls'].includes(type)) {
                  return <SpreadsheetViewer url={contentUrl} theme={theme} />;
                }

                // Image files
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
                  return (
                    <img
                      src={contentUrl}
                      alt={doc.filename}
                      className="w-full h-full object-contain"
                    />
                  );
                }

                // Fallback for unsupported types - show extracted text if available
                if (doc.content_text) {
                  return (
                    <TextViewer
                      content={doc.content_text}
                      theme={theme}
                    />
                  );
                }

                // No content available
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                      <div className="w-[400px] h-[400px] bg-cyan-500/20 blur-[100px] rounded-full" />
                    </div>
                    <div className="text-center z-10">
                      <FileIcon
                        type={doc.type}
                        className="w-20 h-20 text-cyan-500 mx-auto mb-4"
                      />
                      <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">
                        Preview Not Available
                      </p>
                    </div>
                  </div>
                );
              })()}
            </Suspense>
          </div>

          {/* Right: Metadata Panel */}
          <AnimatePresence>
            {showMetadata && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "33.33%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-full border-l border-white/10 bg-[#080808] flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <h2
                      className="text-lg font-semibold text-white line-clamp-2"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </h2>
                    <div className="flex gap-2 mt-2 text-xs text-slate-500">
                      <span className="bg-white/5 px-2 py-0.5 rounded">
                        {doc.size}
                      </span>
                      <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">
                        {doc.sector || "Uncategorized"}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Status
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusColor(doc.processing_status)}
                    >
                      {getStatusIcon(doc.processing_status)}
                      <span className="ml-1">{doc.processing_status}</span>
                    </Badge>
                  </div>

                  {/* AI Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-purple-400 uppercase tracking-widest">
                        AI Summary
                      </div>
                      {!summary && (
                        <button
                          onClick={generateSummary}
                          disabled={
                            summaryLoading ||
                            doc.processing_status !== "completed"
                          }
                          className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50 flex items-center gap-1"
                        >
                          {summaryLoading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          Generate
                        </button>
                      )}
                    </div>
                    {summary ? (
                      <div className="text-xs text-slate-300 bg-purple-500/5 p-3 rounded-lg border border-purple-500/10 max-h-40 overflow-y-auto">
                        {summary}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        {doc.processing_status === "completed"
                          ? "Click Generate to create summary"
                          : "Complete processing first"}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-yellow-500 uppercase tracking-widest">
                        Notes
                      </div>
                      {notesSaving && (
                        <Loader2
                          size={12}
                          className="animate-spin text-yellow-500"
                        />
                      )}
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your notes here..."
                      className="w-full h-24 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 text-xs text-slate-300 placeholder:text-slate-600 resize-none focus:outline-none focus:border-yellow-500/30"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Details
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-600">Uploaded:</span>{" "}
                        {format(new Date(doc.created_at), "MMM d, yyyy HH:mm")}
                      </div>
                      <div>
                        <span className="text-slate-600">Size:</span>{" "}
                        {formatFileSize(doc.file_size)}
                      </div>
                      {doc.page_count && (
                        <div>
                          <span className="text-slate-600">Pages:</span>{" "}
                          {doc.page_count}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/5 space-y-2">
                  <button
                    onClick={() => {
                      window.open(
                        `/api/v1/documents/${doc.id}/content?token=${token}`,
                        "_blank",
                      );
                      logAction("DOWNLOAD");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm text-red-400 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 left-4 text-[10px] text-slate-600 font-mono">
          <span className="bg-white/5 px-1.5 py-0.5 rounded">M</span> panel
          <span className="mx-2">•</span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded">F</span> fullscreen
          <span className="mx-2">•</span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded">Esc</span> close
        </div>
      </motion.div>
    </div>
  );
};
