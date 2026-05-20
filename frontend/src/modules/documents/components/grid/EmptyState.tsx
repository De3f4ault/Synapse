/**
 * EmptyState Component
 * 
 * Shown when a folder has no documents.
 * Teaches the mental model: "Drag documents here or upload new ones."
 */

import { Folder, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  folderName?: string;
  className?: string;
  onUploadClick?: () => void;
}

export function EmptyState({ folderName, className, onUploadClick }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8",
        "text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-border/50 flex items-center justify-center mb-4">
        <Folder className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-medium text-foreground/80 mb-2">
        {folderName ? `${folderName} is empty` : 'This folder is empty'}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Drag documents here or upload new ones.
      </p>
      
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-primary/10 border border-primary/30",
            "text-primary text-sm font-medium",
            "hover:bg-primary/20 hover:border-primary/50",
            "transition-all duration-150"
          )}
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      )}
    </div>
  );
}
