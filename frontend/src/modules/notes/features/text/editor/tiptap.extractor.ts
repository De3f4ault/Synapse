import type { JSONContent } from '@tiptap/react';

/**
 * Extracts clean plain text from a Tiptap JSONContent document.
 * This becomes content_text — fed to embeddings, BM25, RAG, and AI context.
 */
export function extractTiptapText(doc: JSONContent): string {
  if (!doc?.content) return '';
  const lines: string[] = [];

  function walk(nodes: JSONContent[]): void {
    for (const node of nodes) {
      if (node.type === 'text' && node.text) {
        lines.push(node.text);
      } else if (node.content) {
        walk(node.content);
        // Newline after block-level nodes for readable prose
        if (['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(node.type ?? '')) {
          lines.push('');
        }
      }
    }
  }

  walk(doc.content);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
