/**
 * parseOutput - Engine for AI Output → RenderBlock[]
 *
 * INVARIANT: Pure function, no side effects.
 * INVARIANT: Belongs to engine layer (parsing), not rendering layer.
 *
 * This transforms raw AI output (string) into structured RenderBlock[].
 * Complex parsing (LaTeX, tables) can be added incrementally.
 */

import {
    RenderBlock,
    createMarkdownBlock,
    createCodeBlock,
    createMermaidBlock,
    createFlashcardSetBlock,
    createQuizBlock,
    resetSequenceId,
} from '@/shared/rendering/schema';

// ==================== TYPES ====================

interface ParseOptions {
    /** Reset sequence counter at start */
    resetSequence?: boolean;
}

// ==================== CODE FENCE REGEX ====================

// Matches code fences: ```language\ncode\n``` (also handles language with hyphens)
const CODE_FENCE_REGEX = /```([\w-]*)\n([\s\S]*?)```/g;

// ==================== PARSER ====================

/**
 * Parse AI output into RenderBlock[]
 *
 * Current implementation:
 * - Splits on code fences
 * - Creates markdown blocks for text
 * - Creates code blocks for fenced code
 * - Creates mermaid blocks for 'mermaid' language fences
 *
 * Future extensions:
 * - LaTeX detection
 * - Table detection
 * - Expandable sections
 */
export function parseOutput(content: string, options: ParseOptions = {}): RenderBlock[] {
    if (!content || content.trim() === '') {
        return [];
    }

    if (options.resetSequence) {
        resetSequenceId();
    }

    const blocks: RenderBlock[] = [];
    let lastIndex = 0;

    // Find all code fences
    const matches = [...content.matchAll(CODE_FENCE_REGEX)];

    for (const match of matches) {
        const [fullMatch, language, code] = match;
        const matchStart = match.index ?? 0;

        // Add markdown block for content before this code fence
        if (matchStart > lastIndex) {
            const markdownContent = content.slice(lastIndex, matchStart).trim();
            if (markdownContent) {
                // Check for flashcard tables in the markdown content
                const tableResult = parseFlashcardTable(markdownContent);
                if (tableResult) {
                    blocks.push(tableResult);
                } else {
                    blocks.push(createMarkdownBlock(markdownContent));
                }
            }
        }

        // Add block based on language
        const trimmedCode = (code ?? '').trim();
        const normalizedLang = (language || 'text').toLowerCase();

        // === Study Blocks: synapse-flashcards / synapse-quiz ===
        // INVARIANT: These are preview-only. Invalid JSON falls back to code block.
        if (normalizedLang === 'synapse-flashcards') {
            try {
                const data = JSON.parse(trimmedCode);
                blocks.push(createFlashcardSetBlock(
                    data.title || 'Flashcard Set',
                    Array.isArray(data.cards) ? data.cards : []
                ));
            } catch {
                // JSON parse failed → fall back to code block
                blocks.push(createCodeBlock(trimmedCode, 'json'));
            }
        } else if (normalizedLang === 'synapse-quiz') {
            try {
                const data = JSON.parse(trimmedCode);
                blocks.push(createQuizBlock(
                    data.title || 'Quiz',
                    normalizeQuizQuestions(data.questions),
                    data.difficulty
                ));
            } catch {
                // JSON parse failed → fall back to code block
                blocks.push(createCodeBlock(trimmedCode, 'json'));
            }
        } else if (normalizedLang === 'json') {
            // Try to detect quiz/flashcard JSON automatically
            const studyBlock = parseStudyJSON(trimmedCode);
            if (studyBlock) {
                blocks.push(studyBlock);
            } else {
                blocks.push(createCodeBlock(trimmedCode, 'json'));
            }
        } else if (normalizedLang === 'mermaid') {
            blocks.push(createMermaidBlock(trimmedCode));
        } else {
            blocks.push(createCodeBlock(trimmedCode, language || 'text'));
        }

        lastIndex = matchStart + fullMatch.length;
    }

    // Add remaining content as markdown block
    if (lastIndex < content.length) {
        const remainingContent = content.slice(lastIndex).trim();
        if (remainingContent) {
            // Check for flashcard tables in remaining content
            const tableResult = parseFlashcardTable(remainingContent);
            if (tableResult) {
                blocks.push(tableResult);
            } else {
                blocks.push(createMarkdownBlock(remainingContent));
            }
        }
    }

    // If no code fences found, check for flashcard table in entire content
    if (blocks.length === 0 && content.trim()) {
        const tableResult = parseFlashcardTable(content);
        if (tableResult) {
            blocks.push(tableResult);
        } else {
            blocks.push(createMarkdownBlock(content));
        }
    }

    return blocks;
}

// ==================== FLASHCARD TABLE DETECTION ====================

/**
 * Detect and parse markdown tables that look like flashcard sets.
 * 
 * Patterns detected:
 * - Tables with headers containing FRONT/BACK, QUESTION/ANSWER, PROMPT/ANSWER
 * - Tables with # | content | content format
 * 
 * Returns FlashcardSetBlock if detected, null otherwise.
 */
function parseFlashcardTable(content: string): RenderBlock | null {
    // Look for table header patterns
    const tableHeaderPatterns = [
        /\|\s*#?\s*\|\s*(?:FRONT|Question|Prompt|Term)\s*(?:\([^)]*\))?\s*\|\s*(?:BACK|Answer|Definition)\s*(?:\([^)]*\))?\s*\|/i,
        /\|\s*(?:FRONT|Question|Prompt|Term)\s*\|\s*(?:BACK|Answer|Definition)\s*\|/i,
    ];

    const hasFlashcardHeader = tableHeaderPatterns.some(pattern => pattern.test(content));
    if (!hasFlashcardHeader) {
        return null;
    }

    // Extract title (look for text before the table, like "Flashcards - Topic")
    const titleMatch = content.match(/^(?:\*\*)?([^|\n*]+?)(?:\*\*)?\s*\n/);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : 'Flashcard Set';

    // Parse table rows
    const lines = content.split('\n');
    const cards: Array<{ front: string; back: string }> = [];
    
    let inTable = false;
    let frontIndex = -1;
    let backIndex = -1;

    for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Detect table start
        if (line.includes('|') && !inTable) {
            // Check if this is a header row
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            
            // Find front/back column indices
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (!cell) continue;
                const cellLower = cell.toLowerCase();
                if (cellLower.includes('front') || cellLower.includes('question') || cellLower.includes('prompt') || cellLower.includes('term')) {
                    frontIndex = i;
                } else if (cellLower.includes('back') || cellLower.includes('answer') || cellLower.includes('definition')) {
                    backIndex = i;
                }
            }

            if (frontIndex !== -1 && backIndex !== -1) {
                inTable = true;
                continue;
            }
        }

        // Skip separator row (|---|---|)
        if (inTable && /^\s*\|[\s:-]+\|\s*$/.test(line.replace(/[^|:-\s]/g, ''))) {
            continue;
        }

        // Parse data rows
        if (inTable && line.includes('|')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            
            // Skip if cells don't have enough columns
            const maxIndex = Math.max(frontIndex, backIndex);
            if (cells.length <= maxIndex) continue;

            const frontCell = cells[frontIndex];
            const backCell = cells[backIndex];

            if (!frontCell || !backCell) continue;

            const front = frontCell.replace(/^\d+\.?\s*/, '').trim();
            const back = backCell.trim();

            if (front && back && front.toLowerCase() !== 'front' && !front.toLowerCase().includes('prompt')) {
                cards.push({ front, back });
            }
        }
    }

    // Only return flashcard block if we found valid cards
    if (cards.length > 0) {
        return createFlashcardSetBlock(title, cards);
    }

    return null;
}

// ==================== JSON STUDY BLOCK DETECTION ====================

/**
 * Normalize quiz questions from various AI output formats to our schema.
 * 
 * AI might output:
 * - "question" instead of "prompt"
 * - "correct_answer" instead of "correctIndex"
 * - Missing "id" fields
 */
function normalizeQuizQuestions(questions: unknown[]): Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    prompt: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    explanation?: string;
}> {
    if (!Array.isArray(questions)) return [];

    return questions.map((q: any, idx: number) => {
        const normalized: any = {
            id: q.id || `q${idx + 1}`,
            type: q.type || 'multiple_choice',
            prompt: q.prompt || q.question || q.text || '',
            explanation: q.explanation,
        };

        // Handle options
        if (q.options && Array.isArray(q.options)) {
            normalized.options = q.options;
        }

        // Handle correct answer
        if (q.correctIndex !== undefined) {
            normalized.correctIndex = q.correctIndex;
        } else if (q.correct_index !== undefined) {
            normalized.correctIndex = q.correct_index;
        } else if (q.correct_answer && q.options) {
            // Find index by matching answer text
            const idx = q.options.findIndex((opt: string) => 
                opt.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
            );
            if (idx !== -1) {
                normalized.correctIndex = idx;
            }
        } else if (q.correctAnswer) {
            normalized.correctAnswer = q.correctAnswer;
        }

        return normalized;
    }).filter(q => q.prompt); // Filter out empty questions
}

/**
 * Detect and parse JSON that looks like a quiz or flashcard set.
 * 
 * Quiz patterns:
 * - Has "questions" array with objects containing "question"/"prompt" and "options"
 * 
 * Flashcard patterns:
 * - Has "cards" array with "front"/"back" or "question"/"answer" fields
 */
function parseStudyJSON(jsonStr: string): RenderBlock | null {
    try {
        const data = JSON.parse(jsonStr);
        
        // Check for quiz structure
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            const firstQ = data.questions[0];
            // Quiz has questions with options or type field
            if (firstQ.options || firstQ.type || firstQ.question || firstQ.prompt) {
                const questions = normalizeQuizQuestions(data.questions);
                if (questions.length > 0) {
                    return createQuizBlock(
                        data.title || data.topic || 'Quiz',
                        questions,
                        data.difficulty
                    );
                }
            }
        }

        // Check for flashcard structure
        if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
            const firstCard = data.cards[0];
            if (firstCard.front || firstCard.back || firstCard.question || firstCard.answer) {
                const cards = data.cards.map((c: any) => ({
                    front: c.front || c.question || c.term || '',
                    back: c.back || c.answer || c.definition || '',
                })).filter((c: any) => c.front && c.back);
                
                if (cards.length > 0) {
                    return createFlashcardSetBlock(
                        data.title || data.topic || 'Flashcard Set',
                        cards
                    );
                }
            }
        }

        return null;
    } catch {
        return null;
    }
}

// ==================== STREAMING SUPPORT ====================

/**
 * Append content to existing blocks during streaming
 *
 * Strategy:
 * - If last block is markdown and we're adding markdown, append
 * - Otherwise, add new block
 *
 * This will be enhanced for partial code fence detection.
 */
export function appendToBlocks(
    blocks: RenderBlock[],
    newContent: string
): RenderBlock[] {
    if (!newContent) return blocks;

    // For now, re-parse entire content when streaming completes
    // Future: incremental parsing for streaming tokens
    return blocks;
}

// ==================== UTILITIES ====================

/**
 * Check if content likely contains code fences
 */
export function hasCodeFences(content: string): boolean {
    return CODE_FENCE_REGEX.test(content);
}

/**
 * Extract all code blocks from content
 */
export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const results: Array<{ language: string; code: string }> = [];
    const matches = [...content.matchAll(CODE_FENCE_REGEX)];

    for (const match of matches) {
        const [, language, code] = match;
        results.push({ language: language || 'text', code: (code ?? '').trim() });
    }

    return results;
}

export default parseOutput;
