import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Grid, AlignLeft, Upload, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Module public APIs only - no deep imports
import { SECTOR_SUGGESTIONS } from "./core";
import { useDocuments, DocumentGrid, DocumentTable, useListStore } from "./list";
import { useUploadQueue, UploadQueueBar } from "./upload";
import { useDocumentViewer, DocumentViewer } from "./viewer";

// Layout
import { FloatingPageDock } from "@/components/layout/FloatingPageDock";

/**
 * OMNI-KINETIC Documents Interface (v9.0)
 * 
 * Redesigned with inline upload queue (Paperless-ngx style)
 * - No overlay upload mode
 * - Inline conflict resolution 
 * - Per-file progress tracking
 */

const SECTORS = ["All", ...SECTOR_SUGGESTIONS] as const;
type SectorFilter = (typeof SECTORS)[number];

/**
 * Main Documents Page Component - Pure Orchestration
 */
export function DocumentsPage() {
  // UI state from list store
  const viewMode = useListStore((state) => state.viewMode);
  const setViewMode = useListStore((state) => state.setViewMode);

  // Local UI state
  const [activeSector, setActiveSector] = useState<SectorFilter>("All");
  const [search, setSearch] = useState("");

  const logAction = (msg: string) => console.log("DOC_LOG:", msg);

  // Module hooks
  const { documents, isLoading, deleteDocument } = useDocuments();
  const {
    isProcessing,
    getRootProps,
    getInputProps,
    isDragActive,
    replaceFile,
    keepBothFile,
  } = useUploadQueue({ logAction });

  const { selectedDocument, isViewerOpen, openViewer, closeViewer } =
    useDocumentViewer();

  // Filter documents
  const filtered = documents.filter(
    (d) =>
      (activeSector === "All" || d.sector === activeSector) &&
      d.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      {...getRootProps({ onClick: (e) => e.stopPropagation() })}
      className="h-full flex flex-col relative overflow-hidden nm-bg nm-constellation-bg"
    >
      {/* Hidden file input */}
      <input {...getInputProps()} />

      {/* Full-screen Drop Zone Overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Upload size={40} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Drop files here</h3>
              <p className="text-slate-400">PDF, DOCX, TXT, MD supported</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Header */}
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground/20 select-none">
          Documents
        </h1>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading archives...</p>
          </div>
        ) : viewMode === "grid" ? (
          <DocumentGrid
            documents={filtered}
            isLoading={isLoading}
            onSelect={openViewer}
            onDelete={deleteDocument}
            logAction={logAction}
          />
        ) : (
          <DocumentTable
            documents={filtered}
            isLoading={isLoading}
            onSelect={openViewer}
            onDelete={deleteDocument}
            logAction={logAction}
          />
        )}
      </div>

      {/* Floating Dock */}
      <FloatingPageDock className="justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={search}
            placeholder="Search archives..."
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-transparent border-none outline-none pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-0"
          />
        </div>

        <div className="h-6 w-px bg-border mx-2" />

        {/* Filters (Sectors) - Condensed */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[300px]">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                activeSector === sector
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {sector}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-2" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <div className="flex bg-muted/50 rounded-full p-0.5 border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-full transition-all",
                viewMode === "grid"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-full transition-all",
                viewMode === "list"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <AlignLeft size={16} />
            </button>
          </div>

          {/* Click to browse files */}
          <label className="ml-2 h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg cursor-pointer">
            <Upload size={18} />
            <input {...getInputProps()} className="sr-only" />
          </label>
        </div>
      </FloatingPageDock>

      {/* Upload Queue Bar (Bottom) */}
      <UploadQueueBar
        onReplaceFile={({ id, file, documentId }) => replaceFile(id, file, documentId)}
        onKeepBothFile={({ id, file }) => keepBothFile(id, file)}
        isProcessing={isProcessing}
      />

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {isViewerOpen && selectedDocument && (
          <DocumentViewer
            doc={selectedDocument}
            onClose={closeViewer}
            onDelete={() => deleteDocument(selectedDocument.id)}
            logAction={logAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
