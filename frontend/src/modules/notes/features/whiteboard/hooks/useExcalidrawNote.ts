import { useState, useRef, useCallback, useEffect } from 'react';
import { extractExcalidrawText } from '../editor/excalidraw.extractor';
import { NotesRepository } from '../../../infrastructure/notes.repository';
import type { Note } from '../../../domain/note.types';

const AUTOSAVE_DEBOUNCE_MS = 1500;
const SKIP_INITIAL = 2;

export function useExcalidrawNote(note: Note) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isCheckpointing, setIsCheckpointing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const apiRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const changeCount = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Parse stored content back to Excalidraw initial data
  const initialData = (() => {
    try {
      if (!note.content) return null;
      const parsed = typeof note.content === 'string'
        ? JSON.parse(note.content)
        : note.content;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.elements)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Silent autosave — persists content to DB, no version, no embedding
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    changeCount.current++;
    if (changeCount.current <= SKIP_INITIAL) return;

    setHasUnsavedChanges(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);
    setSaveError(false);

    saveTimer.current = setTimeout(async () => {
      try {
        const content = {
          elements: elements.filter(el => !el.isDeleted),
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            theme: appState.theme,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
        };
        const content_text = extractExcalidrawText(elements as any[]);

        await NotesRepository.updateNote(note.id, {
          content,
          content_text,
          editor_version: 'excalidraw@0',
        });
      } catch (err) {
        console.error('[ExcalidrawNote] Autosave failed:', err);
        if (isMounted.current) setSaveError(true);
      } finally {
        if (isMounted.current) setIsSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [note.id]);

  // Checkpoint: intentional save — cuts version + triggers embedding
  const checkpoint = useCallback(async () => {
    if (isCheckpointing) return;
    setIsCheckpointing(true);
    try {
      await NotesRepository.checkpointNote(note.id);
      if (isMounted.current) setHasUnsavedChanges(false);
    } catch (err) {
      console.error('[ExcalidrawNote] Checkpoint failed:', err);
    } finally {
      if (isMounted.current) setIsCheckpointing(false);
    }
  }, [note.id, isCheckpointing]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        checkpoint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint]);

  return { apiRef, initialData, isSaving, saveError, isCheckpointing, hasUnsavedChanges, checkpoint, handleChange };
}
