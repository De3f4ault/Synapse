/**
 * useNoteAITransform — SSE streaming hook for Tiptap AI text transformations.
 *
 * Consumes the /api/v1/notes/ai/transform SSE endpoint.
 * Streams tokens and builds them into a complete replacement string,
 * then the caller replaces the selected Tiptap content in one transaction.
 *
 * SSE event shapes from the backend:
 *   { type: 'start', action: string }
 *   { type: 'token', text: string }
 *   { type: 'done' }
 *   { type: 'error', message: string }
 */

import { useState, useCallback, useRef } from 'react';
import { NotesRepository } from '../../../infrastructure/notes.repository';
import type { Editor } from '@tiptap/react';

export type TransformAction =
  | 'rewrite'
  | 'summarize'
  | 'expand'
  | 'shorten'
  | 'fix_grammar'
  | 'translate'
  | 'change_tone'
  | 'custom';

interface UseNoteAITransformOptions {
  editor: Editor | null;
  /** Plain-text content of the full Tiptap document (for AI context). */
  noteText?: string;
  /** Summary of canvas shapes (for unified context). */
  canvasSummary?: string;
}

export function useNoteAITransform({
  editor,
  noteText = '',
  canvasSummary = '',
}: UseNoteAITransformOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<boolean>(false);

  const transform = useCallback(
    async (
      action: TransformAction,
      opts?: { language?: string; tone?: string; customPrompt?: string },
    ) => {
      if (!editor) return;

      // Grab selected text from the editor
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, ' ');
      if (!selectedText.trim()) return;

      abortRef.current = false;
      setIsStreaming(true);
      setStreamedText('');
      setError(null);

      let accumulated = '';

      try {
        const stream = await NotesRepository.streamTransform({
          action,
          selected_text: selectedText,
          language: opts?.language,
          tone: opts?.tone,
          custom_prompt: opts?.customPrompt,
          unified_context: { text: noteText, canvas_summary: canvasSummary },
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (abortRef.current) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'token' && event.text) {
                accumulated += event.text;
                setStreamedText(accumulated);
              } else if (event.type === 'error') {
                setError(event.message ?? 'Transform failed');
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }

        reader.releaseLock();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stream failed');
      } finally {
        setIsStreaming(false);
      }

      return accumulated;
    },
    [editor, noteText, canvasSummary],
  );

  /**
   * Apply the accumulated streamed text as a Tiptap replacement.
   * Replaces the current selection with the given text.
   */
  const applyTransform = useCallback(
    (text: string) => {
      if (!editor || !text) return;
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(text)
        .run();
    },
    [editor],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setStreamedText('');
    setError(null);
    abortRef.current = false;
  }, []);

  return {
    transform,
    applyTransform,
    cancel,
    reset,
    isStreaming,
    streamedText,
    error,
  };
}
