import { useState, useCallback } from "react";
import type { EnhancedDocument } from "../types/documents.types";

/**
 * Custom hook for managing document viewer state
 */
export function useDocumentViewer() {
  const [selectedDocument, setSelectedDocument] =
    useState<EnhancedDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openViewer = useCallback((doc: EnhancedDocument) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    // Delay clearing the document to allow for exit animations
    setTimeout(() => {
      setSelectedDocument(null);
    }, 300);
  }, []);

  const toggleViewer = useCallback(
    (doc?: EnhancedDocument) => {
      if (doc) {
        if (selectedDocument?.id === doc.id && isViewerOpen) {
          closeViewer();
        } else {
          openViewer(doc);
        }
      } else {
        if (isViewerOpen) {
          closeViewer();
        }
      }
    },
    [selectedDocument, isViewerOpen, openViewer, closeViewer],
  );

  return {
    selectedDocument,
    isViewerOpen,
    openViewer,
    closeViewer,
    toggleViewer,
  };
}
