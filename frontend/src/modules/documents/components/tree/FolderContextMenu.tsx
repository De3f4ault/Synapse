/**
 * FolderContextMenu Component
 * 
 * Right-click context menu for folder actions:
 * - Create Subfolder
 * - Rename
 * - Delete
 */

import { useRef, useEffect } from 'react';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderTreeNode } from '../../core/types/folder.types';

interface FolderContextMenuProps {
  folder: FolderTreeNode;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateSubfolder: (parentId: number) => void;
  onRename: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

function MenuItem({ icon, label, onClick, variant = 'default', disabled = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg",
        "transition-colors duration-100",
        disabled && "opacity-50 cursor-not-allowed",
        variant === 'default' && "text-foreground/80 hover:bg-muted hover:text-foreground",
        variant === 'danger' && "text-destructive hover:bg-destructive/10 hover:text-red-300"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function FolderContextMenu({
  folder,
  position,
  onClose,
  onCreateSubfolder,
  onRename,
  onDelete,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would overflow viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 150),
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[100] min-w-[180px] p-1.5",
        "bg-slate-900/95 backdrop-blur-xl",
        "border border-border rounded-xl shadow-2xl",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <MenuItem
        icon={<FolderPlus className="w-4 h-4" />}
        label="Create Subfolder"
        onClick={() => {
          onCreateSubfolder(folder.id);
          onClose();
        }}
      />
      
      <MenuItem
        icon={<Pencil className="w-4 h-4" />}
        label="Rename"
        onClick={() => {
          onRename(folder);
          onClose();
        }}
        disabled={folder.is_system}
      />
      
      <div className="my-1 border-t border-border" />
      
      <MenuItem
        icon={<Trash2 className="w-4 h-4" />}
        label="Delete"
        onClick={() => {
          onDelete(folder);
          onClose();
        }}
        variant="danger"
        disabled={folder.is_system}
      />
    </div>
  );
}
