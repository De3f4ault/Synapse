
import { PropsWithChildren } from 'react';
import { Note } from '../domain/note.types';
import { NoteTypeBadge } from './NoteTypeBadge';

interface NoteShellProps {
  note: Note;
  onTitleChange?: (title: string) => void;
  isSaving?: boolean;
}

export function NoteShell({ 
  note, 
  children, 
  onTitleChange,
  isSaving = false 
}: PropsWithChildren<NoteShellProps>) {
  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      {/* 
        Shell Header
        - Dumb component
        - Just displays metadata
        - Status indicator
      */}
      <header className="flex-none h-14 border-b border-white/5 flex items-center px-4 justify-between bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <NoteTypeBadge type={note.type} />
           <input 
             type="text" 
             defaultValue={note.title}
             // Using simple onBlur for title updates to keep shell simple
             // In real app maybe local state + debounce
             onBlur={(e) => onTitleChange?.(e.target.value)}
             className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded px-1"
           />
        </div>
        
        {/* Status Area */}
        <div className="flex items-center gap-4 text-xs">
           <span className={`text-slate-500 transition-colors ${isSaving ? 'text-cyan-400' : ''}`}>
             {isSaving ? 'Saving...' : 'Saved'}
           </span>
        </div>
      </header>

      {/* Editor Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
