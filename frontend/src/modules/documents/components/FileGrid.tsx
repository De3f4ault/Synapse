/**
 * FileGrid — Gallery Mode layout.
 *
 * Square UI aesthetic: folder cards in 2–5 col grid at top, files below.
 * Section headings for visual hierarchy.
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
  onToggleFavorite?: (docId: number) => void;
}

export function FileGrid({
  documents, folders, selectedIds, thumbnails,
  onItemClick, onFolderOpen, onFileOpen, onContextMenu,
  renamingId, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
  onToggleFavorite,
}: FileGridProps) {
  return (
    <div className="space-y-6">
      {/* Folders — card grid */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Folders
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
        </div>
      )}

      {/* Files — gallery grid */}
      {documents.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Files
            </h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
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
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
