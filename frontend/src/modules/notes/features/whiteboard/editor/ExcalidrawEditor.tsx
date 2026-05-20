import { Excalidraw } from '@excalidraw/excalidraw';
import '@/styles/excalidraw.css';
import { useExcalidrawNote } from '../hooks/useExcalidrawNote';
import { ExcalidrawAIInput } from './ExcalidrawAIInput';
import { useRef, useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { Note } from '../../../domain/note.types';

interface ExcalidrawEditorProps {
  note: Note;
  /** Plain-text from Tiptap for unified AI context */
  noteText?: string;
}

export function ExcalidrawEditor({ note, noteText = '' }: ExcalidrawEditorProps) {
  const {
    apiRef, initialData, isSaving, saveError,
    isCheckpointing, hasUnsavedChanges, checkpoint, handleChange,
  } = useExcalidrawNote(note);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Defer rendering until container has real pixel dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 10 && el.clientHeight > 10) setReady(true);
    };
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sanitize a single element — Excalidraw's isTransparent() crashes if
  // strokeColor / backgroundColor are undefined (known upstream bug with
  // elements stored before color defaults were enforced).
  const sanitizeEl = (el: any) => ({
    ...el,
    strokeColor:     el.strokeColor     ?? '#1e1e1c',
    backgroundColor: el.backgroundColor ?? 'transparent',
    fillStyle:       el.fillStyle       ?? 'solid',
    strokeStyle:     el.strokeStyle     ?? 'solid',
    strokeWidth:     el.strokeWidth     ?? 1,
    roughness:       el.roughness       ?? 1,
    opacity:         el.opacity         ?? 100,
  });

  // Build safe initial data with bounded appState values
  const safeInitialData = () => ({
    elements: (initialData?.elements ?? []).map(sanitizeEl),
    appState: {
      viewBackgroundColor: initialData?.appState?.viewBackgroundColor ?? 'transparent',
      theme: initialData?.appState?.theme ?? 'dark',
      // NormalizedZoomValue is a branded type — cast required
      zoom: { value: Math.min(Math.max(initialData?.appState?.zoom?.value ?? 1, 0.1), 5) as any },
      scrollX: initialData?.appState?.scrollX ?? 0,
      scrollY: initialData?.appState?.scrollY ?? 0,
    },
  });

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      {/* Checkpoint Save button — bottom-right, offset to clear Excalidraw's help icon */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 52,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: '0.7rem',
          color: saveError
            ? 'hsl(var(--destructive))'
            : isSaving
              ? 'hsl(var(--muted-foreground))'
              : 'transparent',
          transition: 'color 0.2s',
        }}>
          {saveError ? '⚠ Save failed' : 'Autosaving...'}
        </span>
        <button
          onClick={checkpoint}
          disabled={isCheckpointing || !hasUnsavedChanges}
          title="Save checkpoint (Ctrl+S)"
          style={{ pointerEvents: 'all' }}
          className={`tiptap-checkpoint-btn${hasUnsavedChanges ? ' tiptap-checkpoint-btn--dirty' : ''}`}
        >
          {isCheckpointing ? (
            <span className="tiptap-checkpoint-saving">Saving…</span>
          ) : (
            <>
              {hasUnsavedChanges && <span className="tiptap-unsaved-dot" />}
              <Save size={13} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>

      {ready && (
        <div style={{ width: '100%', height: '100%' }}>
          <Excalidraw
            excalidrawAPI={(api: any) => { apiRef.current = api; }}
            initialData={safeInitialData()}
            onChange={(elements: readonly any[], appState: any) => {
              handleChange(elements, appState);
            }}
          />
          {/* AI Diagram input overlay */}
          <ExcalidrawAIInput apiRef={apiRef} noteText={noteText} />
        </div>
      )}
    </div>
  );
}
