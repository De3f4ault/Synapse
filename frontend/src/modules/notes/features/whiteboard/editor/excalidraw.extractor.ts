
/**
 * Extracts readable text from Excalidraw elements for content_text.
 * Only text elements and shape labels contribute — geometry is ignored.
 * This plain text feeds embeddings, BM25 search, and RAG context.
 */
export function extractExcalidrawText(elements: readonly any[]): string {
  return elements
    .filter(el => !el.isDeleted)
    .filter(el => el.type === 'text' || typeof el.text === 'string')
    .map(el => el.text as string)
    .filter(Boolean)
    .join('\n')
    .trim();
}
