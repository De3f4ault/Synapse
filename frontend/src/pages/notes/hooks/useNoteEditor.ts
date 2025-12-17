import { useState, useEffect, useCallback } from 'react';
import type { NoteResponse } from '@/api/generated';
import type { LocalNoteState, EditorMode, AIProcessingStatus } from '../types/notes.types';

interface UseNoteEditorOptions {
    note: NoteResponse | undefined;
    onSave: (data: LocalNoteState) => void;
}

/**
 * Custom hook for managing note editor state
 */
export function useNoteEditor({ note, onSave }: UseNoteEditorOptions) {
    const [mode, setMode] = useState<EditorMode>('edit');
    const [localNote, setLocalNote] = useState<LocalNoteState | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [aiStatus, setAiStatus] = useState<AIProcessingStatus>({ isProcessing: false });

    // Sync local state when note loads
    useEffect(() => {
        if (note) {
            setLocalNote({
                title: note.title,
                content: note.content || '',
                // NoteResponse does not support tags currently
                tags: [],
            });
            setHasUnsavedChanges(false);
        }
    }, [note]);

    // Track unsaved changes
    useEffect(() => {
        if (note && localNote) {
            const changed =
                localNote.title !== note.title || localNote.content !== (note.content || '');
            setHasUnsavedChanges(changed);
        }
    }, [localNote, note]);

    const updateTitle = useCallback((title: string) => {
        setLocalNote((prev) => (prev ? { ...prev, title } : null));
    }, []);

    const updateContent = useCallback((content: string) => {
        setLocalNote((prev) => (prev ? { ...prev, content } : null));
    }, []);

    // Tag functions removed as tags are not supported defined in NoteResponse

    const toggleMode = useCallback(() => {
        setMode((prev) => (prev === 'edit' ? 'view' : 'edit'));
    }, []);

    const save = useCallback(() => {
        if (localNote && hasUnsavedChanges) {
            onSave(localNote);
        }
    }, [localNote, hasUnsavedChanges, onSave]);

    const startAIProcessing = useCallback((action: AIProcessingStatus['action']) => {
        setAiStatus({ isProcessing: true, action });
    }, []);

    const stopAIProcessing = useCallback(() => {
        setAiStatus({ isProcessing: false });
    }, []);

    return {
        mode,
        localNote,
        hasUnsavedChanges,
        aiStatus,
        updateTitle,
        updateContent,
        toggleMode,
        save,
        startAIProcessing,
        stopAIProcessing,
    };
}
