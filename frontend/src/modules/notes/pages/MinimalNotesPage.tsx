
import { useEffect, useState, useRef } from "react";
import { NotesRepository } from "../infrastructure/notes.repository";
import { Note } from "../domain/note.types";
import { TiptapEditor } from "../features/text/editor/TiptapEditor";
import { ExcalidrawEditor } from "../features/whiteboard/editor/ExcalidrawEditor";
import { useThemeStore } from "@/stores/themeStore";

type EditorMode = 'text' | 'whiteboard';

export function MinimalNotesPage() {
  const [mode, setMode] = useState<EditorMode>('text');
  const { theme, toggleTheme } = useThemeStore();
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the active note ID per mode (session-only)
  const activeIds = useRef<{ text: number | null; whiteboard: number | null }>({
    text: null,
    whiteboard: null
  });

  // Load or Create Note
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const loadNote = async () => {
      try {
        // 1. Check if we have an active ID for this mode in session
        const currentSessionId = activeIds.current[mode];

        if (currentSessionId) {
          const note = await NotesRepository.getNote(currentSessionId);
          if (mounted) {
            setActiveNote(note as unknown as Note);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch recent notes from backend
        const allNotes = await NotesRepository.getAllNotes();
        const recent = (allNotes as unknown as Note[])
          .filter(n => n.type === mode)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

        if (recent) {
          activeIds.current[mode] = recent.id;
          if (mounted) {
            setActiveNote(recent);
            setLoading(false);
          }
        } else {
          // 3. Create a default note
          const newNote = await NotesRepository.createNote({
            title: mode === 'text' ? "My Notes" : "My Canvas",
            type: mode,
            content: undefined,
            content_text: '',
            editor_version: mode === 'text' ? 'tiptap@2' : 'excalidraw@0',
          });
          activeIds.current[mode] = newNote.id;
          if (mounted) {
            setActiveNote(newNote as unknown as Note);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load note:", err);
        if (mounted) {
          setError("Failed to load note. Check your connection.");
          setLoading(false);
        }
      }
    };

    loadNote();

    return () => { mounted = false; };
  }, [mode]);

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">

      {/* Floating Mode Switcher — bottom center to avoid Excalidraw toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-card/90 backdrop-blur-md rounded-full border border-border p-1 shadow-xl">
        <button
          onClick={() => setMode('text')}
          className={`
            px-6 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300
            ${mode === 'text'
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground/70'}
          `}
        >
          Text
        </button>
        <button
          onClick={() => setMode('whiteboard')}
          className={`
            px-6 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300
            ${mode === 'whiteboard'
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground/70'}
          `}
        >
          Canvas
        </button>
        <div className="w-px h-4 bg-foreground/10 mx-2"></div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Editor Container */}
      <div className="flex-1 w-full relative overflow-hidden">
        {error ? (
          <div className="h-full w-full flex items-center justify-center text-red-400 text-sm">
            {error}
          </div>
        ) : loading || !activeNote ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground animate-pulse">
            Initializing {mode}...
          </div>
        ) : (
          mode === 'text' ? (
            <div className="h-full w-full overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 pt-16 pb-32">
                <TiptapEditor note={activeNote} />
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <ExcalidrawEditor note={activeNote} />
            </div>
          )
        )}
      </div>

    </div>
  );
}
