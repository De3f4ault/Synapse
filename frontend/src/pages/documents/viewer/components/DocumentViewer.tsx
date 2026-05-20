/**
 * DocumentViewer — Immersive full-screen reader, v3.
 *
 * Design:
 * - Content fills the entire screen. Zero obstruction.
 * - All chrome lives in ONE floating dock at the bottom-center.
 * - The dock auto-hides after 3s, reappears on mouse movement.
 * - Reading position persists to localStorage automatically.
 *
 * Features (v3):
 * - Reading timer (time spent this session)
 * - Reading speed estimate ("~Xhr left")
 * - Warm reading filter (night mode toggle)
 */

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { ArrowLeft, Download, Loader2, FileText, Sun, Moon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import type { EnhancedDocument } from "../../core/engine/types";
import { TextViewer } from "./TextViewer";

const PDFViewer = lazy(() => import("./PDFViewer").then(m => ({ default: m.PDFViewer })));
const MarkdownViewer = lazy(() => import("./MarkdownViewer").then(m => ({ default: m.MarkdownViewer })));
const EPUBViewer = lazy(() => import("./EPUBViewer").then(m => ({ default: m.EPUBViewer })));
const HTMLViewer = lazy(() => import("./HTMLViewer").then(m => ({ default: m.HTMLViewer })));
const DOCXViewer = lazy(() => import("./DOCXViewer").then(m => ({ default: m.DOCXViewer })));
const SpreadsheetViewer = lazy(() => import("./SpreadsheetViewer").then(m => ({ default: m.SpreadsheetViewer })));

// ─── Reading Position ────────────────────────────────────────────────────────

const posKey = (id: number) => `synapse:reader:${id}`;

function getSavedPage(id: number): number {
  try { return JSON.parse(localStorage.getItem(posKey(id)) || "{}").page || 0; }
  catch { return 0; }
}

function savePage(id: number, page: number) {
  localStorage.setItem(posKey(id), JSON.stringify({ page, ts: Date.now() }));
}

// ─── Time Formatting ─────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function estimateRemaining(currentPage: number, totalPages: number): string {
  const remaining = totalPages - currentPage - 1;
  if (remaining <= 0) return "done";
  const mins = remaining * 1.5; // ~1.5 min per page avg
  if (mins < 60) return `~${Math.ceil(mins)}m left`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `~${h}h ${m}m left` : `~${h}h left`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  doc: EnhancedDocument;
  onClose: () => void;
}

export const DocumentViewer: React.FC<Props> = ({ doc, onClose }) => {
  const token = useAuthStore((s) => s.token);
  const contentUrl = `/api/v1/documents/${doc.id}/content?token=${token}`;

  // Chrome auto-hide
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  // Page tracking
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const saved = useRef(getSavedPage(doc.id));

  // Reading timer
  const [elapsed, setElapsed] = useState(0);

  // Warm filter
  const [warm, setWarm] = useState(() => localStorage.getItem("synapse:warm-filter") === "1");

  const progress = total > 0 ? (page + 1) / total : 0;

  // ─── Reading timer tick ──────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Warm filter persist ─────────────────────────────────────────────────

  const toggleWarm = () => {
    setWarm((w) => {
      localStorage.setItem("synapse:warm-filter", w ? "0" : "1");
      return !w;
    });
  };

  // ─── Auto-hide ───────────────────────────────────────────────────────────

  const resetHide = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    const wake = () => resetHide();
    document.addEventListener("mousemove", wake);
    document.addEventListener("touchstart", wake);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);
    return () => {
      document.removeEventListener("mousemove", wake);
      document.removeEventListener("touchstart", wake);
      clearTimeout(hideTimer.current);
    };
  }, [resetHide]);

  // ─── Keyboard ────────────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ─── Page change → persist ───────────────────────────────────────────────

  const onPageChange = useCallback((p: number, t: number) => {
    setPage(p);
    setTotal(t);
    savePage(doc.id, p);
  }, [doc.id]);

  // ─── Render viewer ──────────────────────────────────────────────────────

  const type = doc.type?.toLowerCase() || "";

  const content = (() => {
    if (type === "pdf")
      return <PDFViewer url={contentUrl} docId={doc.id} initialPage={saved.current} onPageChange={onPageChange} />;
    if (type === "md" || type === "markdown")
      return <MarkdownViewer content={doc.content_text || ""} theme="dark" />;
    if (type === "txt" || type === "text")
      return <TextViewer content={doc.content_text || ""} theme="dark" />;
    if (type === "epub")
      return <EPUBViewer url={contentUrl} theme="dark" />;
    if (type === "html" || type === "htm")
      return <HTMLViewer content={doc.content_text || ""} theme="dark" />;
    if (type === "docx" || type === "doc")
      return <DOCXViewer url={contentUrl} theme="dark" />;
    if (["csv", "xlsx", "xls"].includes(type))
      return <SpreadsheetViewer url={contentUrl} theme="dark" />;
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(type))
      return (
        <div className="w-full h-full flex items-center justify-center bg-black p-8">
          <img src={contentUrl} alt={doc.filename} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      );
    if (doc.content_text)
      return <TextViewer content={doc.content_text} theme="dark" />;

    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <FileText className="w-14 h-14 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
          <p className="text-muted-foreground text-sm">No preview for <span className="font-mono">.{type}</span></p>
        </div>
      </div>
    );
  })();

  const shortName = doc.filename.length > 32
    ? doc.filename.slice(0, 29) + "…"
    : doc.filename;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ─── Warm reading filter overlay ─── */}
      {warm && (
        <div
          className="fixed inset-0 z-[55] pointer-events-none"
          style={{ background: "rgba(255, 170, 50, 0.07)", mixBlendMode: "multiply" }}
        />
      )}

      {/* ─── Progress bar ─── */}
      {total > 0 && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-[60]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* ─── Viewer ─── */}
      <div className="w-full h-full">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-zinc-950">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }>
          {content}
        </Suspense>
      </div>

      {/* ─── Bottom dock ─── */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[60]
                     flex items-center gap-1 px-1.5 py-1.5
                     rounded-2xl bg-zinc-900/90 backdrop-blur-2xl
                     border border-border
                     shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]
                     transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                     ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}
      >
        {/* Back */}
        <button onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all"
          title="Back (Esc)">
          <ArrowLeft size={16} />
        </button>

        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Filename */}
        <span className="px-2 text-[12px] text-muted-foreground select-none truncate max-w-[220px]" title={doc.filename}>
          {shortName}
        </span>

        {/* Page + progress (PDF only) */}
        {total > 0 && (
          <>
            <div className="w-px h-5 bg-white/[0.06]" />
            <div className="px-2 flex items-center gap-1.5 text-[12px] tabular-nums select-none">
              <span className="text-foreground/70 font-medium">{page + 1}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{total}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
            </div>
          </>
        )}

        {/* Reading estimate (PDF only) */}
        {total > 0 && (
          <>
            <div className="w-px h-5 bg-white/[0.06]" />
            <span className="px-2 text-[11px] text-muted-foreground select-none">
              {estimateRemaining(page, total)}
            </span>
          </>
        )}

        {/* Divider before actions */}
        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Reading timer */}
        <span className="px-2 text-[11px] text-muted-foreground tabular-nums select-none" title="Time reading">
          {formatTime(elapsed)}
        </span>

        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Warm filter toggle */}
        <button onClick={toggleWarm}
          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
            warm ? "text-warning bg-warning/10" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
          }`}
          title={warm ? "Disable warm filter" : "Warm reading mode"}>
          {warm ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Download */}
        <button onClick={() => window.open(contentUrl, "_blank")}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all"
          title="Download">
          <Download size={15} />
        </button>
      </div>
    </div>
  );
};
