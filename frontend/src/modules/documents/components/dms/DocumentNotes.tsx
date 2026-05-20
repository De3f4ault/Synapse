/**
 * DocumentNotes — Timestamped notes attached to a document
 *
 * Exact port of Paperless-ngx document-notes.component.ts (121 lines):
 *   - Add note with textarea + Ctrl+Enter submit (L115-118)
 *   - Delete note per entry (L86-98)
 *   - Author display via username field (L100-113)
 *   - Form validation — empty note error (L66-69)
 *   - Network state tracking (L39, L71, L76)
 *
 * API contract (via generated DocumentsService):
 *   GET    /api/v1/documents/{docId}/notes   → DocumentNoteResponse[]
 *   POST   /api/v1/documents/{docId}/notes   → DocumentNoteResponse
 *   DELETE /api/v1/documents/{docId}/notes/{noteId} → MessageResponse
 */

import { useState, useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import {
  StickyNote,
  Trash2,
  Send,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import {
  useDocumentNotes,
  useAddDocumentNote,
  useDeleteDocumentNote,
} from "@/api/hooks/useDocumentNotes";
import type { DocumentNoteResponse } from "@/api/generated";

// ============================================================================
// Props
// ============================================================================

interface DocumentNotesProps {
  documentId: number;
  disabled?: boolean;
}

// ============================================================================
// Helper — matching Paperless displayName (L100-113)
// ============================================================================

function displayName(note: DocumentNoteResponse): string {
  return note.username ?? `User #${note.user_id}`;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentNotes({ documentId, disabled = false }: DocumentNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [], isLoading } = useDocumentNotes(documentId);
  const addMutation = useAddDocumentNote(documentId);
  const deleteMutation = useDeleteDocumentNote(documentId);

  // Paperless addNote (L64-83)
  const handleAdd = async () => {
    const trimmed = newNote.trim();
    if (trimmed.length === 0) {
      setError(true);
      return;
    }
    setError(false);
    await addMutation.mutateAsync(trimmed);
    setNewNote("");
    textareaRef.current?.focus();
  };

  // Paperless noteFormKeydown — Ctrl+Enter submit (L115-118)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <StickyNote size={15} className="text-warning" />
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Notes
        </span>
        {notes.length > 0 && (
          <span className="text-[10px] text-muted-foreground bg-foreground/5 px-1.5 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No notes yet</div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <GlassCard key={note.id} className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                    {note.note}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <UserIcon size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {displayName(note)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(note.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add note form */}
      {!disabled && (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={(e) => {
              setNewNote(e.target.value);
              if (error) setError(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a note... (Ctrl+Enter to submit)"
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-lg text-sm bg-muted/30",
              "border text-foreground/70 placeholder-slate-500 resize-none",
              "focus:outline-none focus:ring-1 focus:ring-primary/50",
              error ? "border-destructive/50" : "border-border"
            )}
          />
          {error && (
            <p className="text-[10px] text-destructive">Note cannot be empty</p>
          )}
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            size="sm"
            className="bg-primary hover:bg-primary text-foreground"
          >
            {addMutation.isPending ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <Send size={13} className="mr-1.5" />
            )}
            Add note
          </Button>
        </div>
      )}
    </div>
  );
}
