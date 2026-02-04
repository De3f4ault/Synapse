/**
 * useExplorer Hook
 * 
 * Unified hook for the Explorer View (Phase 3).
 * Fetches both subfolders and documents based on the current view.
 */

import { useDocuments } from "@/pages/documents/list/hooks/useDocuments";
import { useFolderSubtree, useUpdateFolder, useDeleteFolder, useCreateFolder } from "./useFolders";
import { useFolderStore } from "../state/folderStore";

export function useExplorer() {
  const currentView = useFolderStore((state) => state.currentView);
  const { mutate: updateFolder } = useUpdateFolder();
  const { mutate: deleteFolder } = useDeleteFolder();
  const { mutate: createFolder } = useCreateFolder();
  
  // 1. Determine Fetch Parameters
  const isFolderView = currentView.type === 'folder';
  const folderId = isFolderView ? currentView.folderId : null;
  
  // 2. Fetch Subfolders (Only in Folder View)
  const { 
    data: folders = [], 
    isLoading: isLoadingFolders 
  } = useFolderSubtree(isFolderView ? folderId : null);

  // 3. Fetch Documents
  // For 'folder' view, use folderId. For others, pass the view type directly.
  const { 
    documents, 
    isLoading: isLoadingDocs,
    deleteDocument 
  } = useDocuments({
    folderId,
    includeAll: !isFolderView, // If not folder view, we might want all (filtered by view)
    view: !isFolderView ? (currentView.type as 'recent' | 'favorites' | 'archived') : undefined,
  });

  // 4. Combine Results
  // In non-folder views (Recent, Favorites), we typically don't show folders, just docs.
  // In Folder view, we show Subfolders + Docs.
  const showFolders = isFolderView;

  return {
    folders: showFolders ? folders : [],
    documents,
    isLoading: isLoadingFolders || isLoadingDocs,
    currentView,
    deleteDocument,
    deleteFolder,
    updateFolder,
    createFolder
  };
}
