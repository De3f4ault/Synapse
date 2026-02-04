
export type NoteType = 'text' | 'whiteboard';

export interface Note {
  id: string;
  title: string;
  type: NoteType;
  // Content is intentionally unknown to prevent coupling. 
  // Editors must cast/validate this themselves.
  content: unknown; 
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreateDTO {
  title: string;
  type: NoteType;
  content?: unknown;
}

export interface NoteUpdateDTO {
  title?: string;
  content?: unknown;
  updatedAt: string;
}
