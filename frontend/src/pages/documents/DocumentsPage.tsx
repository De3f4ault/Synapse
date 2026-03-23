/**
 * DocumentsPage — Orchestrator (Paperless-ngx DMS Layout)
 *
 * Mounts DocumentsHub (the Paperless-style DMS view) instead of the
 * old Google Drive-style FileGrid/FileList layout.
 *
 * Owns: data fetching, upload, navigation.
 * Delegates: filter/sort/selection/display → DocumentsHub.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Data hooks
import { useDocuments } from "./list/hooks/useDocuments";
import { useFolderTree } from "@/modules/documents/core/hooks/useFolders";
import { useFolderStore } from "@/modules/documents/core/state/folderStore";

// DMS Hub (Paperless-ngx style)
import { DocumentsHub } from "@/modules/documents/components/DocumentsHub";

// Upload
import { UploadArea } from "./upload/components/UploadArea";
import { UploadQueueBar } from "./upload/components/UploadQueueBar";
import { useDocumentUpload } from "./upload/hooks/useDocumentUpload";

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

  // Upload hook
  const upload = useDocumentUpload();

  // --- Handlers ---
  const handleDocumentClick = useCallback((doc: EnhancedDocument) => {
    navigate(`/documents/${doc.id}`);
  }, [navigate]);

  const handleFolderClick = useCallback((_folder: FolderTreeNode) => {
    // Folder navigation handled by sidebar
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
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

      {/* Upload integration */}
      {showUpload && (
        <UploadArea
          getRootProps={upload.getRootProps}
          getInputProps={upload.getInputProps}
          isDragActive={upload.isDragActive}
          onCancel={() => setShowUpload(false)}
        />
      )}
      <UploadQueueBar
        onReplaceFile={() => upload.handleReplace()}
        onKeepBothFile={() => upload.handleKeepBoth()}
        isProcessing={upload.isUploading}
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
