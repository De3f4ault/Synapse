/**
 * useIngestionProgress — Zustand + WebSocket store for document ingestion progress
 *
 * Exact port of Paperless-ngx websocket-status.service.ts (308 lines).
 *
 * Key concepts ported directly:
 *   - FileStatus class → TypeScript interface with phase tracking
 *   - FileStatusPhase enum (STARTED=0, UPLOADING=1, WORKING=2, SUCCESS=3, FAILED=4)
 *   - Progress calculation formula:
 *       UPLOADING: (current/max) * 0.2       (0-20%)
 *       WORKING:   (current/max) * 0.8 + 0.2 (20-100%)
 *   - FILE_STATUS_MESSAGES mapping for human-readable status
 *   - Task ID + filename linking for upload→processing handoff
 *   - dismiss() and dismissCompleted() methods
 *
 * Synapse difference: uses socket.io-client (already installed)
 * instead of raw WebSocket. The backend emits socket.io events on
 * the /ws/progress namespace.
 */

import { create } from "zustand";

// ============================================================================
// Enums & Constants (exact match of Paperless)
// ============================================================================

export enum FileStatusPhase {
  STARTED = 0,
  UPLOADING = 1,
  WORKING = 2,
  SUCCESS = 3,
  FAILED = 4,
}

/**
 * Human-readable messages — from websocket-status.service.ts L23-40
 */
export const FILE_STATUS_MESSAGES: Record<string, string> = {
  document_already_exists: "Document already exists.",
  document_already_exists_in_trash: "Document already exists. Note: existing document is in the trash.",
  asn_already_exists: "Document with ASN already exists.",
  file_not_found: "File not found.",
  new_file: "Received new file.",
  unsupported_type: "File type not supported.",
  parsing_document: "Processing document...",
  generating_thumbnail: "Generating thumbnail...",
  parse_date: "Retrieving date from document...",
  save_document: "Saving document...",
  finished: "Finished.",
};

// ============================================================================
// FileStatus (ported from Paperless FileStatus class, L42-90)
// ============================================================================

export interface FileStatus {
  /** Unique task ID (from backend) — may be null during upload phase */
  taskId: string | null;
  /** Original filename */
  filename: string;
  /** Current processing phase */
  phase: FileStatusPhase;
  /** Progress within current phase (numerator) */
  currentPhaseProgress: number;
  /** Max progress within current phase (denominator) */
  currentPhaseMaxProgress: number;
  /** Human-readable status message */
  message: string;
  /** Document ID (set once processing assigns one) */
  documentId: number | null;
  /** Owner user ID for permission filtering */
  ownerId: number | null;
}

/**
 * Calculate overall progress 0.0–1.0
 * (exact Paperless formula from websocket-status.service.ts L59-73)
 */
export function getProgress(status: FileStatus): number {
  const { phase, currentPhaseProgress: current, currentPhaseMaxProgress: max } = status;
  if (max <= 0) return phase >= FileStatusPhase.SUCCESS ? 1.0 : 0.0;

  switch (phase) {
    case FileStatusPhase.STARTED:
      return 0.0;
    case FileStatusPhase.UPLOADING:
      return (current / max) * 0.2;
    case FileStatusPhase.WORKING:
      return (current / max) * 0.8 + 0.2;
    case FileStatusPhase.SUCCESS:
    case FileStatusPhase.FAILED:
      return 1.0;
    default:
      return 0.0;
  }
}

// ============================================================================
// WebSocket message types (from Paperless data models)
// ============================================================================

interface WebsocketProgressMessage {
  task_id: string;
  filename?: string;
  status?: string;
  current_progress?: number;
  max_progress?: number;
  message?: string;
  document_id?: number;
  owner_id?: number;
}

// ============================================================================
// Store
// ============================================================================

interface IngestionProgressState {
  /** All tracked file statuses */
  statuses: FileStatus[];
  /** WebSocket connected flag */
  connected: boolean;

  // Actions matching Paperless WebsocketStatusService methods
  /**
   * Create a new FileStatus for an upload (before backend assigns task_id).
   * Matching Paperless newFileUpload (L125-130)
   */
  newFileUpload: (filename: string) => FileStatus;

  /**
   * Handle a WebSocket progress message.
   * Matching Paperless handleProgressUpdate (L203-244)
   */
  handleProgressUpdate: (msg: WebsocketProgressMessage) => void;

  /**
   * Mark a status as failed with an error message.
   * Matching Paperless fail() (L247-251)
   */
  fail: (taskIdOrFilename: string, message: string) => void;

  /**
   * Link an upload's FileStatus to a backend task_id
   * (called after HTTP upload returns the task_id)
   */
  linkTaskId: (filename: string, taskId: string) => void;

  /**
   * Remove a single status.
   * Matching Paperless dismiss() (L260-273)
   */
  dismiss: (taskIdOrFilename: string) => void;

  /**
   * Remove all completed/failed statuses.
   * Matching Paperless dismissCompleted() (L275-282)
   */
  dismissCompleted: () => void;

  /** Set connected flag */
  setConnected: (connected: boolean) => void;

  // Derived getters
  getNotCompleted: () => FileStatus[];
  getCompleted: () => FileStatus[];
}

function createFileStatus(overrides: Partial<FileStatus> = {}): FileStatus {
  return {
    taskId: null,
    filename: "",
    phase: FileStatusPhase.STARTED,
    currentPhaseProgress: 0,
    currentPhaseMaxProgress: 0,
    message: "",
    documentId: null,
    ownerId: null,
    ...overrides,
  };
}

export const useIngestionProgress = create<IngestionProgressState>((set, get) => ({
  statuses: [],
  connected: false,

  newFileUpload: (filename: string) => {
    const status = createFileStatus({ filename });
    set((state) => ({ statuses: [...state.statuses, status] }));
    return status;
  },

  handleProgressUpdate: (msg: WebsocketProgressMessage) => {
    set((state) => {
      const statuses = [...state.statuses];

      // Find existing by taskId or filename (Paperless get() L108-123)
      let index = statuses.findIndex((s) => s.taskId === msg.task_id);
      if (index === -1 && msg.filename) {
        index = statuses.findIndex(
          (s) => s.filename === msg.filename && s.taskId === null
        );
      }

      let status: FileStatus;
      let isNew = false;

      if (index >= 0) {
        status = { ...statuses[index] };
      } else {
        status = createFileStatus();
        isNew = true;
      }

      // Update fields
      status.taskId = msg.task_id;
      if (msg.filename) status.filename = msg.filename;
      if (msg.document_id) status.documentId = msg.document_id;
      if (msg.owner_id) status.ownerId = msg.owner_id;

      // Update progress (Paperless updateProgress L75-89)
      // Phase only moves forward, never backward
      const newPhase = msg.status
        ? (FileStatusPhase[msg.status as keyof typeof FileStatusPhase] ?? status.phase)
        : FileStatusPhase.WORKING;

      if (newPhase >= status.phase) {
        status.phase = newPhase;
      }
      if (msg.current_progress != null) {
        status.currentPhaseProgress = msg.current_progress;
      }
      if (msg.max_progress != null) {
        status.currentPhaseMaxProgress = msg.max_progress;
      }

      // Map message key to human-readable (Paperless L218-222)
      if (msg.message && msg.message in FILE_STATUS_MESSAGES) {
        status.message = FILE_STATUS_MESSAGES[msg.message];
      } else if (msg.message) {
        status.message = msg.message;
      }

      if (isNew) {
        statuses.push(status);
      } else {
        statuses[index] = status;
      }

      return { statuses };
    });
  },

  fail: (taskIdOrFilename: string, message: string) => {
    set((state) => {
      const statuses = state.statuses.map((s) => {
        if (s.taskId === taskIdOrFilename || s.filename === taskIdOrFilename) {
          return { ...s, phase: FileStatusPhase.FAILED, message };
        }
        return s;
      });
      return { statuses };
    });
  },

  linkTaskId: (filename: string, taskId: string) => {
    set((state) => {
      const statuses = state.statuses.map((s) => {
        if (s.filename === filename && s.taskId === null) {
          return { ...s, taskId };
        }
        return s;
      });
      return { statuses };
    });
  },

  // Paperless dismiss (L260-273): find by taskId first, then filename
  dismiss: (taskIdOrFilename: string) => {
    set((state) => {
      let index = state.statuses.findIndex((s) => s.taskId === taskIdOrFilename);
      if (index === -1) {
        index = state.statuses.findIndex((s) => s.filename === taskIdOrFilename);
      }
      if (index === -1) return state;
      const statuses = [...state.statuses];
      statuses.splice(index, 1);
      return { statuses };
    });
  },

  // Paperless dismissCompleted (L275-282): remove SUCCESS + FAILED
  dismissCompleted: () => {
    set((state) => ({
      statuses: state.statuses.filter(
        (s) => s.phase !== FileStatusPhase.SUCCESS && s.phase !== FileStatusPhase.FAILED
      ),
    }));
  },

  setConnected: (connected: boolean) => set({ connected }),

  getNotCompleted: () =>
    get().statuses.filter((s) => s.phase < FileStatusPhase.SUCCESS),

  getCompleted: () =>
    get().statuses.filter(
      (s) => s.phase === FileStatusPhase.SUCCESS || s.phase === FileStatusPhase.FAILED
    ),
}));
