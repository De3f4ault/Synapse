/**
 * Document Context Menu
 * 
 * Right-click context menu for document actions.
 * Phase 2A: Document Agency
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileEdit,
  FolderInput,
  Star,
  StarOff,
  Download,
  Archive,
  ExternalLink,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFolderStore } from '../core/state/folderStore';
import type { EnhancedDocument } from '../core/types';

interface DocumentContextMenuProps {
  doc: EnhancedDocument;
  position: { x: number; y: number };
  onClose: () => void;
  onOpen?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onToggleFavorite?: () => void;
  onDownload?: () => void;
  onArchive?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof FileEdit;
  action: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function DocumentContextMenu({
  doc,
  position,
  onClose,
  onOpen,
  onRename,
  onMove,
  onToggleFavorite,
  onDownload,
  onArchive,
}: DocumentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { cutItems } = useFolderStore();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Reposition if near edge
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 300),
  };

  const isFavorite = (doc as unknown as { is_favorite?: boolean }).is_favorite ?? false;

  const menuItems: MenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      icon: ExternalLink,
      action: () => {
        onOpen?.();
        onClose();
      },
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: FileEdit,
      action: () => {
        onRename?.();
        onClose();
      },
    },
    {
      id: 'move',
      label: 'Move to Folder',
      icon: FolderInput,
      action: () => {
        onMove?.();
        onClose();
      },
    },
    {
      id: 'favorite',
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: isFavorite ? StarOff : Star,
      action: () => {
        onToggleFavorite?.();
        onClose();
      },
    },
    {
      id: 'download',
      label: 'Download',
      icon: Download,
      action: () => {
        onDownload?.();
        onClose();
      },
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: Scissors,
      action: () => {
        cutItems([`doc:${doc.id}`]);
        onClose();
      },
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      action: () => {
        onArchive?.();
        onClose();
      },
      variant: 'danger',
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[9999] min-w-[200px] py-1.5 rounded-xl",
        "bg-popover backdrop-blur-xl border border-border",
        "shadow-2xl shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Document Info Header */}
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground truncate">
          {doc.filename}
        </p>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm",
              "transition-colors duration-100",
              item.disabled && "opacity-50 cursor-not-allowed",
              item.variant === 'danger'
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground/80 hover:bg-muted/50"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>,
    window.document.body
  );
}
