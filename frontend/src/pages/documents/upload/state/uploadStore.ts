/**
 * Upload Store - FSM-based queue for document uploads
 *
 * Each upload item has a finite state:
 *   queued → uploading → success | conflict | error
 *
 * Owns: upload queue, per-item state, conflict data
 * Does NOT own: active document (that's core)
 */

import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

export type UploadStatus =
    | 'queued'      // Waiting to upload
    | 'uploading'   // Currently uploading
    | 'success'     // Upload complete
    | 'conflict'    // Duplicate detected (409)
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
    conflict?: ConflictInfo;    // Conflict data if status === 'conflict'
    error?: string;             // Error message if status === 'error'
}

// Legacy compatibility
export interface UploadProgress {
    [filename: string]: number;
}

// ============================================================================
// Store
// ============================================================================

interface UploadState {
    // Queue
    queue: UploadItem[];

    // Actions - Queue Management
    addToQueue: (files: File[]) => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    clearCompleted: () => void;

    // Actions - State Transitions
    setUploading: (id: string) => void;
    setProgress: (id: string, progress: number) => void;
    setSuccess: (id: string) => void;
    setConflict: (id: string, conflict: ConflictInfo) => void;
    setError: (id: string, error: string) => void;

    // Actions - Conflict Resolution
    resolveConflict: (id: string, action: 'replace' | 'keepBoth' | 'skip') => void;

    // Computed
    hasQueue: () => boolean;
    hasConflicts: () => boolean;
    isAnyUploading: () => boolean;
}

export const useUploadStore = create<UploadState>((set, get) => ({
    queue: [],

    // --- Queue Management ---

    addToQueue: (files) => {
        const newItems: UploadItem[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            status: 'queued',
            progress: 0,
        }));
        set((state) => ({ queue: [...state.queue, ...newItems] }));
    },

    removeFromQueue: (id) => {
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
    },

    clearQueue: () => set({ queue: [] }),

    clearCompleted: () => {
        set((state) => ({
            queue: state.queue.filter((item) => item.status !== 'success'),
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

    // --- Conflict Resolution (handled by hook, this just marks resolved) ---

    resolveConflict: (id, action) => {
        if (action === 'skip') {
            // Just remove from queue
            get().removeFromQueue(id);
        }
        // 'replace' and 'keepBoth' are handled by the hook, then marked success
    },

    // --- Computed ---

    hasQueue: () => get().queue.length > 0,

    hasConflicts: () => get().queue.some((item) => item.status === 'conflict'),

    isAnyUploading: () => get().queue.some((item) => item.status === 'uploading'),
}));
