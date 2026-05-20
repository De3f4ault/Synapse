
export type NoteType = 'text' | 'whiteboard';

export interface Note {
  id: number;                      // integer PK from backend
  title: string;
  type: NoteType;
  content: unknown;                // JSONB render blob — only the editor reads this
  content_text: string;            // plain text — the intelligence layer reads this
  editor_version: string;          // 'tiptap@2' | 'excalidraw@0'
  parent_id: number | null;
  journal_date: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateDTO {
  title: string;
  type: NoteType;
  content?: unknown;
  content_text?: string;
  editor_version?: string;
  parent_id?: number | null;
}

export interface NoteUpdateDTO {
  title?: string;
  content?: unknown;
  content_text?: string;
  editor_version?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
}
