/**
 * FileGrid — Gallery Mode layout.
 * Folders in a compact horizontal strip at top.
 * Files in a responsive grid below.
 */

import type { EnhancedDocument } from "../core/types";
import type { FolderTreeNode } from "../core/types/folder.types";
import { FileCard } from "./FileCard";
import { FolderCardNew } from "./FolderCardNew";

interface FileGridProps {
  documents: EnhancedDocument[];
  folders: FolderTreeNode[];
  selectedIds: Set<string>;
  thumbnails: Record<string, string | null>;
  onItemClick: (id: string, e: React.MouseEvent) => void;
  onFolderOpen: (folderId: number) => void;
  onFileOpen: (docId: number) => void;
  onContextMenu: (id: string, kind: "doc" | "folder", e: React.MouseEvent) => void;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

export function FileGrid({
  documents, folders, selectedIds, thumbnails,
  onItemClick, onFolderOpen, onFileOpen, onContextMenu,
  renamingId, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
}: FileGridProps) {
  return (
    <div className="space-y-6">
      {/* Folders — compact horizontal strip */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => (
            <FolderCardNew
              key={`folder-${folder.id}`}
              folder={folder}
              isSelected={selectedIds.has(`folder:${folder.id}`)}
              onClick={(e) => onItemClick(`folder:${folder.id}`, e)}
              onDoubleClick={() => onFolderOpen(folder.id)}
              onContextMenu={(e) => onContextMenu(`folder:${folder.id}`, "folder", e)}
            />
          ))}
        </div>
      )}

      {/* Files — gallery grid */}
      {documents.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
          {documents.map((doc) => (
            <FileCard
              key={`doc-${doc.id}`}
              doc={doc}
              isSelected={selectedIds.has(`doc:${doc.id}`)}
              thumbnailUrl={thumbnails[doc.id.toString()]}
              onClick={(e) => onItemClick(`doc:${doc.id}`, e)}
              onDoubleClick={() => onFileOpen(doc.id)}
              onContextMenu={(e) => onContextMenu(`doc:${doc.id}`, "doc", e)}
              isRenaming={renamingId === `doc:${doc.id}`}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
