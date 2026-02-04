/**
 * CreateFolderDialog Component
 * 
 * Modal dialog for creating new folders or subfolders.
 */

import { useState, useEffect, useRef } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/shared/ui';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, parentId: number | null) => void;
  parentId?: number | null;
  parentName?: string;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onCreate,
  parentId = null,
  parentName,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(name.trim(), parentId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <GlassCard
          className="w-full max-w-md p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {parentId ? 'Create Subfolder' : 'Create Folder'}
              </h2>
              {parentName && (
                <p className="text-xs text-slate-400">in {parentName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="folder-name" className="block text-sm font-medium text-slate-300 mb-2">
              Folder Name
            </label>
            <input
              ref={inputRef}
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name..."
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "bg-slate-800/50 border border-white/10",
                "text-white placeholder-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50",
                "transition-all duration-200"
              )}
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </GlassCard>
      </div>
    </div>
  );
}
