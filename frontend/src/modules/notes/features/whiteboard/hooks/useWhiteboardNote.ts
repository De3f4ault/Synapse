
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Editor, TLStoreSnapshot } from "tldraw";
import { Note } from "../../../domain/note.types";
import { NotesRepository } from "../../../infrastructure/notes.repository";

// DEBOUNCE_DELAY_MS: 500ms (Matched with Phase 3)
const DEBOUNCE_DELAY_MS = 500;

export function useWhiteboardNote(note: Note) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const isMounted = useRef(true);

  // 1. Initial Snapshot Hydration
  // We handle potential double-encoded JSON strings
  const initialSnapshot = useMemo(() => {
    try {
      if (!note.content) return undefined;
      const parsed = typeof note.content === 'string' 
        ? JSON.parse(note.content) 
        : note.content;
      return parsed as TLStoreSnapshot;
    } catch (e) {
      console.error("Failed to parse whiteboard content:", e);
      return undefined;
    }
  }, [note.content]);

  // 2. Change Listener
  // We define the listener factory that will be attached on mount
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Listen to store changes
    // This is the official way to detect any change in the document
    const cleanup = editor.store.listen(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);

        saveTimeoutRef.current = setTimeout(async () => {
            if (!editorRef.current) return;

            // Capture opaque snapshot
            const snapshot = editorRef.current.getSnapshot();

            try {
                await NotesRepository.updateNote(note.id, {
                    content: snapshot,
                    updatedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error("Failed to auto-save whiteboard:", err);
            } finally {
                if (isMounted.current) {
                    setIsSaving(false);
                }
            }
        }, DEBOUNCE_DELAY_MS);
    });

    return () => {
        cleanup();
    };
  }, [note.id]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
        isMounted.current = false;
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, []);

  return {
    handleMount,
    initialSnapshot,
    isSaving
  };
}
