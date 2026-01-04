import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  BookOpen,
  FileText,
  Maximize,
  Minimize,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Import CSS for annotations and text layer
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type PDFTheme = "light" | "sepia" | "twilight" | "dark";

interface PDFViewerProps {
  url: string;
  theme?: PDFTheme;
  className?: string;
}

type ViewMode = "single" | "double";

const themeStyles: Record<PDFTheme, string> = {
  light: "",
  sepia: "sepia brightness-[0.95]",
  twilight: "brightness-[0.85] contrast-[1.1] saturate-[0.8]",
  dark: "invert hue-rotate-180",
};

const themeBackgrounds: Record<PDFTheme, string> = {
  light: "bg-slate-100",
  sepia: "bg-amber-50",
  twilight: "bg-slate-900",
  dark: "bg-zinc-900",
};

/**
 * Enhanced PDF Viewer with double-page mode, arrow key navigation,
 * smooth animations, and premium visual design
 */
export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  theme = "light",
  className = "",
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [fitMode, setFitMode] = useState<"width" | "page">("page");
  const [pageInputValue, setPageInputValue] = useState<string>("1");
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate pages to show based on view mode
  const getVisiblePages = useCallback((): number[] => {
    if (viewMode === "single") {
      return [currentPage];
    }
    // Double page mode - show pairs (1), (2-3), (4-5), etc.
    if (currentPage === 1) {
      return numPages > 1 ? [1, 2] : [1];
    }
    const leftPage = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const rightPage = leftPage + 1;
    return rightPage <= numPages ? [leftPage, rightPage] : [leftPage];
  }, [currentPage, numPages, viewMode]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    setError(err.message);
    setLoading(false);
  };

  // Navigation functions
  const goToPrevPage = useCallback(() => {
    if (viewMode === "double") {
      setCurrentPage((p) => Math.max(1, p - 2));
    } else {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
  }, [viewMode]);

  const goToNextPage = useCallback(() => {
    if (viewMode === "double") {
      setCurrentPage((p) => Math.min(numPages, p + 2));
    } else {
      setCurrentPage((p) => Math.min(numPages, p + 1));
    }
  }, [numPages, viewMode]);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(numPages);

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  // Toggle fit mode
  const toggleFitMode = () => {
    setFitMode((prev) => (prev === "width" ? "page" : "width"));
    setScale(prev => prev === 1.25 ? 1.0 : 1.25);
  };

  // Handle page input
  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNum = parseInt(pageInputValue, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
        setCurrentPage(pageNum);
      } else {
        setPageInputValue(currentPage.toString());
      }
    }
  };

  // Update page input when current page changes
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowLeft":
          if (e.ctrlKey || e.metaKey) {
            goToFirstPage();
          } else {
            goToPrevPage();
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (e.ctrlKey || e.metaKey) {
            goToLastPage();
          } else {
            goToNextPage();
          }
          e.preventDefault();
          break;
        case "ArrowUp":
          zoomIn();
          e.preventDefault();
          break;
        case "ArrowDown":
          zoomOut();
          e.preventDefault();
          break;
        case "Home":
          goToFirstPage();
          e.preventDefault();
          break;
        case "End":
          goToLastPage();
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevPage, goToNextPage, numPages]);

  const progressPercent = numPages > 0 ? (currentPage / numPages) * 100 : 0;
  const visiblePages = getVisiblePages();

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col ${themeBackgrounds[theme]} ${className}`}
      tabIndex={0}
    >
      {/* Premium Control Bar */}
      <div className="relative z-20">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 backdrop-blur-xl">
          {/* Left: Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToFirstPage}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="First page (Ctrl+←)"
            >
              <ChevronsLeft size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="Previous page (←)"
            >
              <ChevronLeft size={18} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <input
                type="text"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={handlePageInput}
                onBlur={() => setPageInputValue(currentPage.toString())}
                className="w-12 text-center text-sm font-mono bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                title="Enter page number"
              />
              <span className="text-slate-500 font-mono text-sm">/</span>
              <span className="text-slate-300 font-mono text-sm">{numPages || "..."}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="Next page (→)"
            >
              <ChevronRight size={18} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            <button
              onClick={goToLastPage}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="Last page (Ctrl+→)"
            >
              <ChevronsRight size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>

          {/* Center: View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode("single")}
                className={`p-2 rounded-md transition-all duration-200 ${viewMode === "single"
                    ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Single page view"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={() => setViewMode("double")}
                className={`p-2 rounded-md transition-all duration-200 ${viewMode === "double"
                    ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Double page view (book mode)"
              >
                <BookOpen size={16} />
              </button>
            </div>

            <button
              onClick={toggleFitMode}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
              title={fitMode === "width" ? "Fit to page" : "Fit to width"}
            >
              {fitMode === "width" ? (
                <Minimize size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
              ) : (
                <Maximize size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
              )}
            </button>
          </div>

          {/* Right: Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="Zoom out (↓)"
            >
              <ZoomOut size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <input
                type="range"
                min="50"
                max="300"
                value={scale * 100}
                onChange={(e) => setScale(parseInt(e.target.value) / 100)}
                className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30"
              />
              <span className="text-xs text-slate-400 font-mono w-10 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all duration-200 group"
              title="Zoom in (↑)"
            >
              <ZoomIn size={16} className="text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                <Loader2 className="relative animate-spin text-cyan-400" size={40} />
              </div>
              <span className="text-slate-400 text-sm font-medium">Loading PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <div className="text-red-400 mb-2">Error loading PDF</div>
              <p className="text-slate-500 text-sm max-w-md">{error}</p>
            </div>
          </div>
        )}

        <div className={`flex justify-center items-start p-6 min-h-full ${viewMode === "double" ? "gap-4" : ""}`}>
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className={`flex ${viewMode === "double" ? "gap-4" : ""}`}
          >
            <AnimatePresence mode="wait">
              {visiblePages.map((pageNum, index) => (
                <motion.div
                  key={`page-${pageNum}`}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: index === 0 ? 20 : -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative group"
                >
                  <div className="absolute -inset-2 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className={`relative ${themeStyles[theme]} transition-all duration-300`}>
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-2xl shadow-black/50 rounded-sm"
                    />

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                      {pageNum}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </Document>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="relative h-1 bg-black/40">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm"
          style={{ left: `${progressPercent}%`, transform: "translateX(-50%)" }}
        />
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/5">
        <span className="bg-white/10 px-1 rounded">←</span>
        <span className="bg-white/10 px-1 rounded ml-1">→</span>
        <span className="text-slate-500 ml-1.5">navigate</span>
      </div>
    </div>
  );
};

export default PDFViewer;
