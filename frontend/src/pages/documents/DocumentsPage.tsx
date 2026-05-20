/**
 * DocumentsPage — Orchestrator (Paperless-ngx DMS Layout)
 *
 * Upload wiring:
 *   - useUploadQueue (FSM-based, writes to uploadStore)
 *   - GlobalDropZone catches page-wide drag-and-drop
 *   - UploadModal is a polished overlay triggered by Upload button
 *   - UploadQueueBar reads from uploadStore and routes conflict actions
 *     back into useUploadQueue.replaceFile / keepBothFile
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Data hooks
import { useDocuments } from "./list/hooks/useDocuments";
import { useFolderTree } from "@/modules/documents/core/hooks/useFolders";
import { useFolderStore } from "@/modules/documents/core/state/folderStore";

// DMS Hub (Paperless-ngx style)
import { DocumentsHub } from "@/modules/documents/components/DocumentsHub";

// Upload
import { UploadModal } from "./upload/components/UploadModal";
import { UploadQueueBar } from "./upload/components/UploadQueueBar";
import { useUploadQueue } from "./upload/hooks/useUploadQueue";

// Global drag-and-drop overlay
import { GlobalDropZone } from "@/modules/documents/components/dms/GlobalDropZone";

// Sprint 5 wiring
import { IngestionProgressList } from "@/modules/documents/components/dms/IngestionProgressBar";
import { useIngestionProgress } from "@/modules/documents/hooks/useIngestionProgress";

// Types
import type { EnhancedDocument } from "@/modules/documents/core/types";
import type { FolderTreeNode } from "@/modules/documents/core/types/folder.types";

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const navigate = useNavigate();

  // --- Core state ---
  const { selectedFolderId } = useFolderStore();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // --- Data ---
  const { documents, isLoading, refetch } = useDocuments({ folderId: selectedFolderId });
  const { data: folderTree = [] } = useFolderTree();

  // --- Upload (FSM-based, backed by uploadStore) ---
  const uploadQueue = useUploadQueue();

  // --- Handlers ---
  const handleDocumentClick = useCallback((doc: EnhancedDocument) => {
    navigate(`/documents/${doc.id}`);
  }, [navigate]);

  const handleFolderClick = useCallback((_folder: FolderTreeNode) => {
    // Folder navigation handled by sidebar
  }, []);

  // Global drag-drop lands here - add to queue directly
  const handleGlobalDrop = useCallback((files: File[]) => {
    uploadQueue.addToQueue(files);
  }, [uploadQueue]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Global drag-and-drop overlay (page-wide) */}
      <GlobalDropZone onDrop={handleGlobalDrop} />

      <DocumentsHub
        documents={documents}
        folders={folderTree as FolderTreeNode[]}
        isLoading={isLoading}
        viewMode="grid"
        onViewChange={() => {}}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onUpload={() => setShowUpload(true)}
        onDocumentClick={handleDocumentClick}
        onFolderClick={handleFolderClick}
        onRefresh={refetch}
      />

      {/* Upload modal overlay */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        getRootProps={uploadQueue.getRootProps}
        getInputProps={uploadQueue.getInputProps}
        isDragActive={uploadQueue.isDragActive}
        isProcessing={uploadQueue.isProcessing}
      />

      {/* Upload queue tray - reads from uploadStore, routes conflict actions */}
      <UploadQueueBar
        onReplaceFile={({ id, file, documentId }) =>
          uploadQueue.replaceFile(id, file, documentId)
        }
        onKeepBothFile={({ id, file }) =>
          uploadQueue.keepBothFile(id, file)
        }
        isProcessing={uploadQueue.isProcessing}
      />

      {/* Ingestion progress overlay */}
      <IngestionProgressOverlay />
    </>
  );
}

// ─── Ingestion Progress Overlay ──────────────────────────────────────────────

function IngestionProgressOverlay() {
  const { statuses, dismiss, dismissCompleted } = useIngestionProgress();
  if (statuses.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <IngestionProgressList
        statuses={statuses}
        onDismiss={dismiss}
        onDismissCompleted={dismissCompleted}
      />
    </div>
  );
}
