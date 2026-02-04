
import { useEffect, useState, useRef } from "react";
import { NotesRepository } from "../infrastructure/notes.repository";
import { Note } from "../domain/note.types";
import { BlockNoteEditor } from "../features/text/editor/BlockNoteEditor";
import { WhiteboardEditor } from "../features/whiteboard/editor/WhiteboardEditor";

type EditorMode = 'text' | 'whiteboard';

export function MinimalNotesPage() {
  const [mode, setMode] = useState<EditorMode>('text');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // We keep track of the active note ID for each mode to persist user's place
  // session-based only for now.
  const activeIds = useRef<{ text: string | null; whiteboard: string | null }>({
    text: null,
    whiteboard: null
  });

  // Load or Create Note logic
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadNote = async () => {
      try {
        // 1. Check if we have an active ID for this mode in session
        const currentSessionId = activeIds.current[mode];
        
        if (currentSessionId) {
            const note = await NotesRepository.getNote(currentSessionId);
            if (mounted) {
                setActiveNote(note);
                setLoading(false);
            }
            return;
        }

        // 2. If no session ID, try to find *most recent* note of this type
        const allNotes = await NotesRepository.getAllNotes();
        // Since we don't have sorting in repo yet, we rely on array order or simple client sort
        // Assuming fetchAll returns all.
        const recent = allNotes
            .filter(n => n.type === mode)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        if (recent) {
            activeIds.current[mode] = recent.id;
            if (mounted) {
                setActiveNote(recent);
                setLoading(false);
            }
        } else {
            // 3. If no note exists, create a default one
            console.log(`No ${mode} note found, creating default...`);
            const newNote = await NotesRepository.createNote({
                title: mode === 'text' ? "My Notes" : "My Canvas",
                type: mode,
                content: undefined
            });
            activeIds.current[mode] = newNote.id;
            if (mounted) {
                setActiveNote(newNote);
                setLoading(false);
            }
        }
      } catch (err) {
        console.error("Failed to load note logic", err);
        // Fallback or error state? For minimal mode, maybe just retry or show error
      }
    };

    loadNote();

    return () => { mounted = false; };
  }, [mode]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-slate-200 flex flex-col overflow-hidden">
      
      {/* 
        Minimal Header / Slider 
        Floating top center, transparent but accessible.
      */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 p-1 shadow-xl">
        <button
            onClick={() => setMode('text')}
            className={`
                px-6 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300
                ${mode === 'text' 
                    ? 'bg-slate-100 text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'}
            `}
        >
            Text
        </button>
        <button
            onClick={() => setMode('whiteboard')}
            className={`
                px-6 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300
                ${mode === 'whiteboard' 
                    ? 'bg-slate-100 text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'}
            `}
        >
            Canvas
        </button>
        <div className="w-px h-4 bg-white/10 mx-2"></div>
        <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
            {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Editor Container */}
      <div className="flex-1 w-full h-full">
         {loading || !activeNote ? (
             <div className="h-full w-full flex items-center justify-center text-slate-600 animate-pulse">
                Initializing {mode}...
             </div>
         ) : (
             mode === 'text' ? (
                 // Text Mode Constraints
                 // We limit width for readability in this raw mode, or full?
                 // User said "official ui/ux", but usually text is centered.
                 // We'll give it a max-width container but full height.
                 <div className="h-full w-full max-w-4xl mx-auto pt-20 px-6">
                    <BlockNoteEditor note={activeNote} theme={theme} />
                 </div>
             ) : (
                 // Canvas Mode Constraints
                 // Full screen absolute
                 <div className="h-full w-full absolute inset-0">
                    <WhiteboardEditor note={activeNote} />
                 </div>
             )
         )}
      </div>

    </div>
  );
}
