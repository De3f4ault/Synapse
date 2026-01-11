import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DocumentsHub } from "@/modules/documents";
import { useDocuments, useListStore } from "./list";
import { useUploadQueue, UploadQueueBar } from "./upload";
import { useDocumentViewer, DocumentViewer } from "./viewer";
import { EnhancedDocument } from "./core/engine/types";

/**
 * Main Documents Page Component
 * Wraps the modern DocumentsHub with necessary business logic and upload handling.
 */
export function DocumentsPage() {
  // UI state from list store
  const viewMode = useListStore((state) => state.viewMode) || "grid";
  const setViewMode = useListStore((state) => state.setViewMode);

  // Local UI state
  const [activeSector, setActiveSector] = useState<string>("All");
  const [search, setSearch] = useState("");

  const logAction = (msg: string) => console.log("DOC_LOG:", msg);

  // Module hooks
  const { documents, isLoading, deleteDocument } = useDocuments();
  const {
    isProcessing,
    getRootProps,
    getInputProps,
    replaceFile,
    keepBothFile,
  } = useUploadQueue({ logAction });

  const { selectedDocument, isViewerOpen, openViewer, closeViewer } =
    useDocumentViewer();

  // Filter documents
  const filtered = documents.filter(
    (d: EnhancedDocument) =>
      (activeSector === "All" || d.sector === activeSector) &&
      d.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      {...getRootProps({ onClick: (e) => e.stopPropagation() })}
      className="h-full relative"
    >
      {/* Hidden file input for drag & drop global handler */}
      <input {...getInputProps()} />

      {/* Main UI Hub */}
      <DocumentsHub
        documents={filtered as any} // Cast to match local EnhancedDocument vs module EnhancedDocument if needed
        isLoading={isLoading}
        viewMode={viewMode}
        onViewChange={setViewMode}
        searchQuery={search}
        onSearchChange={setSearch}
        activeFilter={activeSector}
        onFilterChange={setActiveSector}
        onUpload={() => {
          // Trigger hidden input click
          document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'));
        }}
        onDocumentClick={openViewer as any}
      />

      {/* Upload Queue Bar (Bottom Overlay) */}
      <div className="fixed bottom-0 left-0 right-0 z-[60]">
        <UploadQueueBar
          onReplaceFile={({ id, file, documentId }) => replaceFile(id, file, documentId)}
          onKeepBothFile={({ id, file }) => keepBothFile(id, file)}
          isProcessing={isProcessing}
        />
      </div>

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

