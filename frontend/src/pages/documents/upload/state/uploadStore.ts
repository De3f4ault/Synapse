/**
 * Upload Store - FSM-based queue for document uploads
 *
 * FSM per item:
 *   queued → uploading → success | conflict | skipped | error
 *
 * 'skipped' is used for auto-resolved duplicates (exact/same_content)
 * 'conflict' is only for same_filename (genuinely ambiguous — needs human input)
 */

import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

export type UploadStatus =
    | 'queued'      // Waiting to upload
    | 'uploading'   // Currently uploading
    | 'success'     // Upload complete
    | 'skipped'     // Auto-skipped (exact/content duplicate)
    | 'conflict'    // Ambiguous duplicate — needs human input (same_filename only)
    | 'error';      // Upload failed

export interface ConflictInfo {
    conflict_type: 'exact_duplicate' | 'same_content' | 'same_filename';
    existing_document_id: number;
    existing_filename: string;
    existing_file_size: number;
    existing_uploaded_at: string;
    message: string;
}

export interface UploadItem {
    id: string;                 // Unique ID for this upload
    file: File;                 // The file being uploaded
    status: UploadStatus;       // Current state
    progress: number;           // 0-100 upload progress
    conflict?: ConflictInfo;    // Conflict data if status === 'conflict'|'skipped'
    error?: string;             // Error message if status === 'error'
}

// Session-level summary (reset per batch, not per item)
export interface SessionSummary {
    totalQueued: number;
    uploaded: number;
    skipped: number;
    conflicts: number;
    errors: number;
    completedAt: Date | null;
}

// ============================================================================
// Store
// ============================================================================

interface UploadState {
    // Queue
    queue: UploadItem[];

    // Session summary (populated when all done)
    session: SessionSummary | null;

    // Actions - Queue Management
    addToQueue: (files: File[]) => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    clearCompleted: () => void;

    // Actions - State Transitions
    setUploading: (id: string) => void;
    setProgress: (id: string, progress: number) => void;
    setSuccess: (id: string) => void;
    setSkipped: (id: string, conflict: ConflictInfo) => void;
    setConflict: (id: string, conflict: ConflictInfo) => void;
    setError: (id: string, error: string) => void;

    // Actions - Conflict Resolution (human input)
    resolveSkip: (id: string) => void;

    // Session
    computeSession: () => void;
    clearSession: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
    queue: [],
    session: null,

    // --- Queue Management ---

    addToQueue: (files) => {
        const newItems: UploadItem[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            status: 'queued',
            progress: 0,
        }));
        set((state) => ({
            queue: [...state.queue, ...newItems],
            session: null, // reset summary when new files come in
        }));
    },

    removeFromQueue: (id) => {
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
    },

    clearQueue: () => set({ queue: [] }),

    clearCompleted: () => {
        set((state) => ({
            queue: state.queue.filter(
                (item) => item.status !== 'success' && item.status !== 'skipped'
            ),
        }));
    },

    // --- State Transitions ---

    setUploading: (id) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, status: 'uploading', progress: 0 } : item
            ),
        }));
    },

    setProgress: (id, progress) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, progress } : item
            ),
        }));
    },

    setSuccess: (id) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, status: 'success', progress: 100 } : item
            ),
        }));
    },

    // Auto-resolved duplicate (no user action needed)
    setSkipped: (id, conflict) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, status: 'skipped', conflict, progress: 100 } : item
            ),
        }));
    },

    // Only for same_filename — needs human resolution
    setConflict: (id, conflict) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, status: 'conflict', conflict, progress: 100 } : item
            ),
        }));
    },

    setError: (id, error) => {
        set((state) => ({
            queue: state.queue.map((item) =>
                item.id === id ? { ...item, status: 'error', error } : item
            ),
        }));
    },

    // Human-driven skip from conflict state
    resolveSkip: (id) => {
        get().removeFromQueue(id);
    },

    // --- Session Summary ---

    computeSession: () => {
        const q = get().queue;
        set({
            session: {
                totalQueued: q.length,
                uploaded: q.filter((i) => i.status === 'success').length,
                skipped: q.filter((i) => i.status === 'skipped').length,
                conflicts: q.filter((i) => i.status === 'conflict').length,
                errors: q.filter((i) => i.status === 'error').length,
                completedAt: new Date(),
            },
        });
    },

    clearSession: () => set({ session: null }),
}));
