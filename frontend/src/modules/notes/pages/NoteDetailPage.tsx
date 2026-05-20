
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Note } from "../domain/note.types";
import { NotesRepository } from "../infrastructure/notes.repository";
import { NoteDispatcher } from "../bridge/note-dispatcher";
import { NoteShell } from "../ui/NoteShell";
import { TiptapEditor } from "../features/text/editor/TiptapEditor";
import { ExcalidrawEditor } from "../features/whiteboard/editor/ExcalidrawEditor";

// Page level state - dumbest loading state possible
type PageState = 
  | { status: 'loading' }
  | { status: 'error', error: string }
  | { status: 'ready', note: Note };

export function NoteDetailPage() {
  const { noteId } = useParams();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  // 1. Data Fetching (Simple)
  useEffect(() => {
    if (!noteId) return;

    let mounted = true;
    setState({ status: 'loading' });

    NotesRepository.getNote(Number(noteId))
      .then(note => {
        if (mounted) setState({ status: 'ready', note });
      })
      .catch(err => {
        if (mounted) setState({ status: 'error', error: err.message });
      });

    return () => { mounted = false; };
  }, [noteId]);

  // 2. Loading / Error States
  if (state.status === 'loading') {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Loading Note...</div>;
  }
  if (state.status === 'error') {
     return <div className="h-full flex items-center justify-center text-destructive">Error: {state.error}</div>;
  }

  const { note } = state;
  const editorType = NoteDispatcher.getEditorType(note);

  // 3. Dispatch Logic
  // Explicit switch - no dynamic components
  // The editors handle their own saving internally.
  // The Shell handles the title.
  
  const handleTitleChange = (newTitle: string) => {
     NotesRepository.updateNote(note.id, {
        title: newTitle
     });
     // Optimistic update of local state if needed, 
     // but since it's just title we can rely on React key diffing or just let it be.
  };

  return (
    <NoteShell note={note} onTitleChange={handleTitleChange}>
       {editorType === 'text' && <TiptapEditor note={note} />}
       {editorType === 'whiteboard' && <ExcalidrawEditor note={note} />}
    </NoteShell>
  );
}
