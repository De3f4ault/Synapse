/**
 * PDFViewer — @react-pdf-viewer with full session persistence + highlighting.
 *
 * Persists to localStorage per-document:
 * - Current page
 * - Zoom scale
 * - Sidebar open state & active tab
 * - Highlights (text selections with notes)
 *
 * Uses the official highlight plugin for text selection highlighting.
 * Sidebar flicker fixed by using setInitialTab + stable CSS overrides.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  highlightPlugin,
  Trigger,
  type HighlightArea,
  type RenderHighlightTargetProps,
  type RenderHighlightContentProps,
  type RenderHighlightsProps,
} from "@react-pdf-viewer/highlight";
import type { PageChangeEvent, ZoomEvent } from "@react-pdf-viewer/core";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: number;
  content: string;
  highlightAreas: HighlightArea[];
  quote: string;
  color: string;
  createdAt: number;
}

interface ViewerState {
  page: number;
  scale: number | string;
  sidebarTab: number;
  sidebarOpen: boolean;
  highlights: Note[];
  ts: number;
}

interface PDFViewerProps {
  url: string;
  docId?: number;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
  className?: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const stateKey = (docId: number) => `synapse:pdf:${docId}`;

function loadState(docId: number): ViewerState | null {
  try {
    const raw = localStorage.getItem(stateKey(docId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(docId: number, state: Partial<ViewerState>) {
  try {
    const existing = loadState(docId) || {};
    localStorage.setItem(stateKey(docId), JSON.stringify({ ...existing, ...state, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Highlight Colors ─────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "rgba(255, 235, 59, 0.35)" },
  { name: "Green", value: "rgba(76, 175, 80, 0.30)" },
  { name: "Blue", value: "rgba(33, 150, 243, 0.30)" },
  { name: "Pink", value: "rgba(233, 30, 99, 0.25)" },
  { name: "Orange", value: "rgba(255, 152, 0, 0.30)" },
];

const WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// ─── Component ────────────────────────────────────────────────────────────────

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  docId,
  initialPage = 0,
  onPageChange,
  className = "",
}) => {
  const resolvedDocId = docId ?? 0;
  const saved = useRef(loadState(resolvedDocId));
  const startPage = saved.current?.page ?? initialPage;
  const startScale = saved.current?.scale ?? 1;
  const startTab = saved.current?.sidebarTab ?? -1; // -1 = closed

  // ─── Highlights state ───────────────────────────────────────────────────

  const [notes, setNotes] = useState<Note[]>(saved.current?.highlights ?? []);
  const [message, setMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]?.value ?? "rgba(255, 235, 59, 0.35)");
  const noteIdRef = useRef(notes.length);

  // Persist highlights on change
  useEffect(() => {
    if (resolvedDocId) saveState(resolvedDocId, { highlights: notes });
  }, [notes, resolvedDocId]);

  // ─── Highlight plugin callbacks ─────────────────────────────────────────

  const renderHighlightTarget = useCallback((props: RenderHighlightTargetProps) => (
    <div
      style={{
        position: "absolute",
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translate(0, 8px)",
        zIndex: 10,
      }}
    >
      <button
        onClick={props.toggle}
        className="px-3 py-1.5 rounded-lg bg-zinc-800/95 backdrop-blur-sm border border-white/10 text-[12px] text-zinc-200 hover:bg-zinc-700 transition-all shadow-xl flex items-center gap-1.5"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        Highlight
      </button>
    </div>
  ), []);

  const renderHighlightContent = useCallback((props: RenderHighlightContentProps) => {
    const addNote = () => {
      const note: Note = {
        id: ++noteIdRef.current,
        content: message,
        highlightAreas: props.highlightAreas,
        quote: props.selectedText,
        color: selectedColor,
        createdAt: Date.now(),
      };
      setNotes((prev) => [...prev, note]);
      setMessage("");
      props.cancel();
    };

    return (
      <div
        style={{
          position: "absolute",
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: "translate(0, 8px)",
          zIndex: 20,
        }}
        className="w-72 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3"
      >
        {/* Color picker */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelectedColor(c.value)}
              className="w-5 h-5 rounded-full border-2 transition-all"
              style={{
                background: c.value,
                borderColor: selectedColor === c.value ? "white" : "transparent",
              }}
              title={c.name}
            />
          ))}
        </div>

        {/* Note input */}
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note (optional)…"
          className="w-full bg-zinc-800/80 border border-white/10 rounded-lg px-2.5 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={addNote}
            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[12px] font-medium transition-colors"
          >
            Save
          </button>
          <button
            onClick={props.cancel}
            className="px-3 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 text-[12px] transition-colors"
          >
            Cancel
          </button>
          <span className="text-[10px] text-zinc-600 ml-auto">Enter to save</span>
        </div>
      </div>
    );
  }, [message, selectedColor]);

  const renderHighlights = useCallback((props: RenderHighlightsProps) => (
    <div>
      {notes.map((note) => (
        <React.Fragment key={note.id}>
          {note.highlightAreas
            .filter((area) => area.pageIndex === props.pageIndex)
            .map((area, idx) => (
              <div
                key={idx}
                title={note.content || note.quote}
                style={{
                  ...props.getCssProperties(area, props.rotation),
                  background: note.color,
                  position: "absolute",
                  cursor: "pointer",
                  mixBlendMode: "multiply",
                  borderRadius: "2px",
                  transition: "opacity 150ms",
                }}
                className="hover:opacity-70"
              />
            ))}
        </React.Fragment>
      ))}
    </div>
  ), [notes]);

  // ─── Highlight plugin ───────────────────────────────────────────────────

  const highlightPluginInstance = highlightPlugin({
    trigger: Trigger.TextSelection,
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
  });

  // ─── Notes sidebar tab content ──────────────────────────────────────────

  const sidebarNotes = useMemo(() => (
    <div className="p-3 text-[12px]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {notes.length === 0 ? (
        <p className="text-zinc-500 text-center py-6">
          Select text to highlight
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 font-medium">{notes.length} highlight{notes.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => { if (confirm("Clear all highlights?")) setNotes([]); }}
              className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-white/[0.06] p-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
              onClick={() => { const area = note.highlightAreas[0]; if (area) highlightPluginInstance.jumpToHighlightArea(area); }}
            >
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: note.color }} />
                <div className="min-w-0">
                  <p className="text-zinc-300 text-[11px] leading-relaxed line-clamp-3 italic">
                    "{note.quote}"
                  </p>
                  {note.content && (
                    <p className="text-zinc-400 text-[11px] mt-1.5">{note.content}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end mt-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotes((prev) => prev.filter((n) => n.id !== note.id));
                  }}
                  className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ), [notes, highlightPluginInstance]);

  // ─── Default layout plugin ──────────────────────────────────────────────

  const defaultLayout = defaultLayoutPlugin({
    setInitialTab: startTab >= 0 ? () => Promise.resolve(startTab) : undefined,
    sidebarTabs: (defaultTabs) => [
      ...defaultTabs,
      {
        content: sidebarNotes,
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        ),
        title: "Highlights",
      },
    ],
  });

  // ─── Event handlers ─────────────────────────────────────────────────────

  const handlePageChange = useCallback((e: PageChangeEvent) => {
    onPageChange?.(e.currentPage, e.doc.numPages);
    if (resolvedDocId) saveState(resolvedDocId, { page: e.currentPage });
  }, [onPageChange, resolvedDocId]);

  const handleZoom = useCallback((e: ZoomEvent) => {
    if (resolvedDocId) saveState(resolvedDocId, { scale: e.scale });
  }, [resolvedDocId]);

  return (
    <div
      className={`w-full h-full bg-zinc-950 ${className}`}
      style={{ fontFamily: "'Roboto', sans-serif" }}
    >
      <style>{`
        /* System font for PDF viewer chrome */
        .rpv-core__viewer,
        .rpv-default-layout__container,
        .rpv-default-layout__sidebar,
        .rpv-default-layout__toolbar,
        .rpv-bookmark__title,
        .rpv-bookmark__container {
          font-family: 'Roboto', sans-serif !important;
        }
        /* Stabilize sidebar — prevent flicker on hover/interaction */
        .rpv-default-layout__sidebar {
          transition: none !important;
          animation: none !important;
        }
        .rpv-default-layout__sidebar--opened {
          opacity: 1 !important;
          visibility: visible !important;
        }
        /* Bookmark tree stability */
        .rpv-bookmark__container {
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        .rpv-bookmark__title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Smoother page transitions */
        .rpv-core__page-layer {
          transition: none !important;
        }
        /* Brighter sidebar text */
        .rpv-default-layout__sidebar .rpv-bookmark__title {
          color: rgba(255,255,255,0.85) !important;
        }
        .rpv-default-layout__sidebar .rpv-bookmark__title:hover {
          color: rgba(255,255,255,1) !important;
        }
      `}</style>
      <Worker workerUrl={WORKER_URL}>
        <Viewer
          fileUrl={url}
          plugins={[defaultLayout, highlightPluginInstance]}
          theme="dark"
          defaultScale={typeof startScale === "number" ? startScale : SpecialZoomLevel.PageWidth}
          initialPage={startPage}
          onPageChange={handlePageChange}
          onZoom={handleZoom}
        />
      </Worker>
    </div>
  );
};

export default PDFViewer;
