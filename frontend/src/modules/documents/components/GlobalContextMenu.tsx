import { 
  FolderPlus, 
  Upload, 
  Grid, 
  List, 
  RefreshCw, 
  CheckSquare, 
  Clipboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GlobalContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  viewMode: 'grid' | 'list';
  onViewChange: (mode: 'grid' | 'list') => void;
  onPaste?: () => void;
  canPaste?: boolean;
}

export const GlobalContextMenu = ({
  position,
  onClose,
  onNewFolder,
  onUpload,
  onRefresh,
  onSelectAll,
  viewMode,
  onViewChange,
  onPaste,
  canPaste
}: GlobalContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  // (Simple implementation, can be improved)
  const style = {
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 250),
  };

  const Item = ({ 
    icon: Icon, 
    label, 
    shortcut, 
    onClick, 
    danger, 
    divider 
  }: { 
    icon: any; 
    label: string; 
    shortcut?: string; 
    onClick: () => void; 
    danger?: boolean;
    divider?: boolean;
  }) => (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
          onClose();
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors rounded-md group",
          danger 
            ? "text-destructive hover:bg-destructive/10 hover:text-red-300" 
            : "text-foreground/80 hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
          <span>{label}</span>
        </div>
        {shortcut && (
          <span className="text-xs text-muted-foreground font-mono group-hover:text-muted-foreground">{shortcut}</span>
        )}
      </button>
      {divider && <div className="h-px bg-foreground/10 my-1 mx-2" />}
    </>
  );

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{ top: style.top, left: style.left }}
      className="fixed z-[100] w-64 p-1.5 rounded-xl border border-border bg-popover backdrop-blur-xl shadow-2xl flex flex-col"
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Actions
      </div>

      <Item 
        icon={FolderPlus} 
        label="New Folder" 
        onClick={onNewFolder} 
      />
      <Item 
        icon={Upload} 
        label="Upload Files" 
        onClick={onUpload} 
        divider
      />

      {canPaste && (
        <Item 
          icon={Clipboard} 
          label="Paste" 
          shortcut="Ctrl+V" 
          onClick={onPaste!} 
          divider
        />
      )}

      <Item 
        icon={CheckSquare} 
        label="Select All" 
        shortcut="Ctrl+A" 
        onClick={onSelectAll} 
      />
      
      <div className="h-px bg-foreground/10 my-1 mx-2" />
      
      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-1">
        View
      </div>
      
      <Item 
        icon={viewMode === 'grid' ? List : Grid} 
        label={viewMode === 'grid' ? "Switch to List" : "Switch to Grid"} 
        onClick={() => onViewChange(viewMode === 'grid' ? 'list' : 'grid')} 
      />
      
      <Item 
        icon={RefreshCw} 
        label="Refresh" 
        shortcut="F5" 
        onClick={onRefresh} 
      />

    </motion.div>
  );
};
