/**
 * useExcalidrawAI — Mermaid-to-Excalidraw AI generation hook.
 *
 * Flow:
 *  1. User types a prompt in the ExcalidrawAIInput overlay
 *  2. This hook POSTs to /api/v1/notes/ai/visualize with the unified context
 *  3. The backend returns a Mermaid.js string
 *  4. We parse it with @excalidraw/mermaid-to-excalidraw
 *  5. We inject the resulting elements into the live Excalidraw scene via
 *     excalidrawAPI.updateScene()
 *
 * The hook returns `inject` — a stable function the overlay can call.
 */

import { useState, useCallback } from 'react';
import { NotesRepository } from '../../../infrastructure/notes.repository';

interface UseExcalidrawAIOptions {
  /** Ref to the Excalidraw API instance (set by the excalidrawAPI prop callback). */
  apiRef: React.MutableRefObject<any>;
  /** Tiptap plain text for unified context. */
  noteText?: string;
}

export function useExcalidrawAI({ apiRef, noteText = '' }: UseExcalidrawAIOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMermaid, setLastMermaid] = useState<string>('');

  const inject = useCallback(
    async (prompt: string, diagramType = 'flowchart') => {
      if (!prompt.trim()) return;

      const api = apiRef.current;

      // Build canvas_summary from current elements for context
      let canvasSummary = '';
      if (api) {
        try {
          const elements = api.getSceneElements() as any[];
          canvasSummary = elements
            .filter((el: any) => el.type === 'text' && el.text)
            .map((el: any) => el.text)
            .join(', ')
            .slice(0, 400);
        } catch {
          // ignore
        }
      }

      setIsGenerating(true);
      setError(null);

      try {
        // 1. Get Mermaid from backend
        const { mermaid } = await NotesRepository.visualize({
          prompt,
          diagram_type: diagramType,
          unified_context: { text: noteText, canvas_summary: canvasSummary },
        });

        setLastMermaid(mermaid);

        // 2. Parse Mermaid → Excalidraw elements
        const { parseMermaidToExcalidraw } = await import(
          '@excalidraw/mermaid-to-excalidraw'
        );

        const { elements, files } = await parseMermaidToExcalidraw(mermaid, {
          fontSize: 14,
        });

        // 3. Sanitize elements — Excalidraw's isTransparent() crashes if
        //    strokeColor / backgroundColor are undefined (known upstream bug).
        const sanitize = (el: any) => ({
          ...el,
          strokeColor:     el.strokeColor     ?? '#1e1e1c',
          backgroundColor: el.backgroundColor ?? 'transparent',
          fillStyle:       el.fillStyle       ?? 'solid',
          strokeStyle:     el.strokeStyle     ?? 'solid',
          strokeWidth:     el.strokeWidth     ?? 1,
          roughness:       el.roughness       ?? 1,
          opacity:         el.opacity         ?? 100,
        });

        // 4. Inject into live canvas
        if (api) {
          const existing = api.getSceneElements() as any[];
          // Offset new elements so they don't overlap existing content
          const maxY = existing.length > 0
            ? Math.max(...existing.map((el: any) => (el.y ?? 0) + (el.height ?? 0)))
            : 0;
          const offsetY = maxY > 0 ? maxY + 60 : 0;

          // Apply sanitize + offset in a single pass
          const positioned = elements.map((el: any) =>
            sanitize({ ...el, y: (el.y ?? 0) + offsetY })
          );

          api.updateScene({
            elements: [...existing.map(sanitize), ...positioned],
          });

          if (files) {
            api.addFiles(Object.values(files));
          }

          // Scroll to show the new elements
          api.scrollToContent(positioned, { animate: true, fitToViewport: false });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Diagram generation failed';
        setError(message);
        console.error('[ExcalidrawAI]', err);
      } finally {
        setIsGenerating(false);
      }
    },
    [apiRef, noteText],
  );

  return { inject, isGenerating, error, lastMermaid };
}
