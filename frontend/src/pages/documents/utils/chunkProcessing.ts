import type { ChunkMetadata } from '../types/documents.types';

/**
 * Default chunk size in characters
 */
const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Default chunk overlap in characters
 */
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split text into chunks with overlap
 */
export function splitIntoChunks(
    text: string,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const endIndex = Math.min(startIndex + chunkSize, text.length);
        const chunk = text.slice(startIndex, endIndex);
        chunks.push(chunk);

        // Move start index forward, accounting for overlap
        startIndex += chunkSize - overlap;

        // Prevent infinite loop
        if (startIndex >= text.length) break;
    }

    return chunks;
}

/**
 * Process text content into chunk metadata
 */
export function processChunks(
    content: string,
    documentId: number,
    chunkSize?: number,
    overlap?: number
): ChunkMetadata[] {
    const textChunks = splitIntoChunks(content, chunkSize, overlap);

    return textChunks.map((chunk, index) => ({
        id: documentId * 1000 + index, // Generate unique ID
        content: chunk.trim(),
                                             metadata: {
                                                 documentId,
                                                 chunkIndex: index,
                                                 totalChunks: textChunks.length,
                                                 startPosition: index * (chunkSize || DEFAULT_CHUNK_SIZE),
                                             },
    }));
}

/**
 * Get metadata for a specific chunk
 */
export function getChunkMetadata(
    chunk: ChunkMetadata
): Record<string, any> {
    return {
        id: chunk.id,
        length: chunk.content.length,
        hasEmbedding: !!chunk.embedding,
        embeddingDimensions: chunk.embedding?.length || 0,
        ...chunk.metadata,
    };
}

/**
 * Find chunks that contain a search query
 */
export function searchChunks(
    chunks: ChunkMetadata[],
    query: string,
    caseSensitive: boolean = false
): ChunkMetadata[] {
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return chunks.filter((chunk) => {
        const content = caseSensitive ? chunk.content : chunk.content.toLowerCase();
        return content.includes(searchQuery);
    });
}

/**
 * Get statistics about chunks
 */
export function getChunkStatistics(chunks: ChunkMetadata[]) {
    const lengths = chunks.map((c) => c.content.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);

    return {
        totalChunks: chunks.length,
        averageLength: totalLength / chunks.length,
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        totalCharacters: totalLength,
        chunksWithEmbeddings: chunks.filter((c) => c.embedding).length,
    };
}

/**
 * Merge overlapping chunks back into full text
 */
export function mergeChunks(chunks: ChunkMetadata[]): string {
    // Sort chunks by their index
    const sortedChunks = [...chunks].sort((a, b) => {
        const indexA = a.metadata?.chunkIndex || 0;
        const indexB = b.metadata?.chunkIndex || 0;
        return indexA - indexB;
    });

    return sortedChunks.map((c) => c.content).join(' ');
}
