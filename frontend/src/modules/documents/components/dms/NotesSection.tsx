/**
 * NotesSection — Timestamped document notes with author
 *
 * Modeled after Paperless-ngx's document-notes component.
 * Shows a list of notes with add-new-note form.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, User } from "lucide-react";
import type { DocumentNote } from "../../core/types/dms";

interface NotesSectionProps {
  notes: DocumentNote[];
  onAddNote: (text: string) => void;
  onDeleteNote: (noteId: number) => void;
  currentUserId?: number;
  isAdding?: boolean;
  className?: string;
}

export function NotesSection({
  notes,
  onAddNote,
  onDeleteNote,
  currentUserId,
  isAdding = false,
  className,
}: NotesSectionProps) {
  const [newNote, setNewNote] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote("");
    setShowInput(false);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MessageSquare size={12} />
          Notes
          {notes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded-full text-[10px]">
              {notes.length}
            </span>
          )}
        </h4>
        {!showInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(true)}
            className="h-6 text-xs"
          >
            <Plus size={12} className="mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Add note form */}
      {showInput && (
        <div className="space-y-2 p-2 rounded-lg border border-white/10 bg-white/[0.02]">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className={cn(
              "w-full bg-transparent text-sm resize-none",
              "placeholder:text-muted-foreground focus:outline-none"
            )}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInput(false);
                setNewNote("");
              }}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newNote.trim() || isAdding}
              className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
            >
              {isAdding ? "Saving…" : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showInput ? (
        <p className="text-xs text-muted-foreground italic py-2">
          No notes yet.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words flex-1">
                  {note.note}
                </p>
                {note.user === currentUserId && (
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                <User size={9} />
                <span>User {note.user}</span>
                <span>•</span>
                <span>
                  {new Date(note.created).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
