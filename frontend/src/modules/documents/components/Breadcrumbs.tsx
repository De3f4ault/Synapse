/**
 * Breadcrumbs — Gallery Mode.
 * Clean, subtle path display. No home icon — just text.
 */

import { ChevronRight } from "lucide-react";
import type { FolderTreeNode } from "../core/types/folder.types";

interface BreadcrumbsProps {
  folderId: number | null;
  folders: FolderTreeNode[];
  onNavigate: (folderId: number | null) => void;
}

function buildPath(nodes: FolderTreeNode[], targetId: number | null): FolderTreeNode[] {
  if (targetId === null) return [];
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    const sub = buildPath(node.children, targetId);
    if (sub.length > 0) return [node, ...sub];
  }
  return [];
}

export function Breadcrumbs({ folderId, folders, onNavigate }: BreadcrumbsProps) {
  const path = buildPath(folders, folderId);

  return (
    <nav className="flex items-center gap-1 text-[13px] min-h-[28px]">
      <button
        onClick={() => onNavigate(null)}
        className={`px-1.5 py-0.5 rounded-md transition-colors ${
          folderId === null
            ? "text-foreground/70 font-medium"
            : "text-muted-foreground hover:text-foreground/80"
        }`}
      >
        Library
      </button>

      {path.map((folder) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`px-1.5 py-0.5 rounded-md transition-colors ${
              folder.id === folderId
                ? "text-foreground/70 font-medium"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
