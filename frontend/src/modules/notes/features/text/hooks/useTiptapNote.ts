import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useState, useCallback } from 'react';
import { extractTiptapText } from '../editor/tiptap.extractor';
import { NotesRepository } from '../../../infrastructure/notes.repository';
import type { Note } from '../../../domain/note.types';

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useTiptapNote(note: Note) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isCheckpointing, setIsCheckpointing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
        blockquote: { HTMLAttributes: { class: 'blockquote' } },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: 'tiptap-link', rel: 'noopener noreferrer' },
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading...';
          return "Write something, or Ctrl+S to checkpoint…";
        },
      }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount,
    ],
    content: (() => {
      try {
        if (!note.content) return undefined;
        const parsed = typeof note.content === 'string'
          ? JSON.parse(note.content)
          : note.content;
        if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).content)) {
          return parsed;
        }
        return undefined;
      } catch {
        return undefined;
      }
    })(),
    onUpdate: ({ editor: e }) => {
      // Mark unsaved changes immediately
      setHasUnsavedChanges(true);

      // Autosave: persists content silently, no version/embedding
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setIsSaving(true);
      setSaveError(false);

      saveTimer.current = setTimeout(async () => {
        const json = e.getJSON();
        const content_text = extractTiptapText(json);
        try {
          await NotesRepository.updateNote(note.id, {
            content: json,
            content_text,
            editor_version: 'tiptap@2',
          });
        } catch (err) {
          console.error('[TiptapNote] Autosave failed:', err);
          if (isMounted.current) setSaveError(true);
        } finally {
          if (isMounted.current) setIsSaving(false);
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  // Checkpoint: intentional save — cuts version + triggers embedding (if content changed)
  const checkpoint = useCallback(async () => {
    if (isCheckpointing) return;
    setIsCheckpointing(true);
    try {
      await NotesRepository.checkpointNote(note.id);
      if (isMounted.current) setHasUnsavedChanges(false);
    } catch (err) {
      console.error('[TiptapNote] Checkpoint failed:', err);
    } finally {
      if (isMounted.current) setIsCheckpointing(false);
    }
  }, [note.id, isCheckpointing]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        checkpoint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  return { editor, isSaving, saveError, isCheckpointing, hasUnsavedChanges, checkpoint, wordCount, charCount };
}
