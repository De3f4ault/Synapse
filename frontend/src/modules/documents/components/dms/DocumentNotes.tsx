/**
 * DocumentNotes — Timestamped notes attached to a document
 *
 * Exact port of Paperless-ngx document-notes.component.ts (121 lines):
 *   - Add note with textarea + Ctrl+Enter submit (L115-118)
 *   - Delete note per entry (L86-98)
 *   - Author display via user lookup (L100-113)
 *   - Form validation — empty note error (L66-69)
 *   - Network state tracking (L39, L71, L76)
 *
 * API contract:
 *   GET    /api/documents/{docId}/notes/   → DocumentNote[]
 *   POST   /api/documents/{docId}/notes/   → { note: string } → DocumentNote[]
 *   DELETE /api/documents/{docId}/notes/{noteId}/ → DocumentNote[]
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types (matching Paperless DocumentNote)
// ============================================================================

export interface DocumentNote {
  id: number;
  note: string;
  created: string;
  user: number | { id: number; username: string; first_name?: string; last_name?: string };
}

// ============================================================================
// Props
// ============================================================================

interface DocumentNotesProps {
  documentId: number;
  disabled?: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

function useDocumentNotes(documentId: number) {
  return useQuery<DocumentNote[]>({
    queryKey: ["documentNotes", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/notes/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch notes (${res.status})`);
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useAddNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation<DocumentNote[], Error, string>({
    mutationFn: async (note) => {
      const res = await fetch(`/api/documents/${documentId}/notes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error(`Failed to add note (${res.status})`);
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["documentNotes", documentId], data);
    },
  });
}

function useDeleteNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation<DocumentNote[], Error, number>({
    mutationFn: async (noteId) => {
      const res = await fetch(`/api/documents/${documentId}/notes/${noteId}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to delete note (${res.status})`);
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["documentNotes", documentId], data);
    },
  });
}

// ============================================================================
// Helper — matching Paperless displayName (L100-113)
// ============================================================================

function displayName(note: DocumentNote): string {
  if (!note.user) return "";
  if (typeof note.user === "object") {
    const u = note.user;
    const parts: string[] = [];
    if (u.first_name) parts.push(u.first_name);
    if (u.last_name) parts.push(u.last_name);
    if (u.username) {
      if (parts.length > 0) parts.push(`(${u.username})`);
      else parts.push(u.username);
    }
    return parts.join(" ");
  }
  return `User #${note.user}`;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentNotes({ documentId, disabled = false }: DocumentNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [], isLoading } = useDocumentNotes(documentId);
  const addMutation = useAddNote(documentId);
  const deleteMutation = useDeleteNote(documentId);

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
        <StickyNote size={15} className="text-amber-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Notes
        </span>
        {notes.length > 0 && (
          <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-xs text-slate-500 py-2">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-xs text-slate-600 py-2">No notes yet</div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <GlassCard key={note.id} className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {note.note}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <UserIcon size={10} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500">
                      {displayName(note)}
                    </span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(note.created).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(note.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
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
              "w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03]",
              "border text-slate-200 placeholder-slate-500 resize-none",
              "focus:outline-none focus:ring-1 focus:ring-cyan-500/50",
              error ? "border-red-500/50" : "border-white/10"
            )}
          />
          {error && (
            <p className="text-[10px] text-red-400">Note cannot be empty</p>
          )}
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
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
