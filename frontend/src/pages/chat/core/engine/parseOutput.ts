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
    createArtifactBlock,
    resetSequenceId,
} from '@/shared/rendering/schema';

// ==================== TYPES ====================

interface ParseOptions {
    /** Reset sequence counter at start */
    resetSequence?: boolean;
    /** Enable artifact detection (default: true) */
    detectArtifacts?: boolean;
}

// ==================== ARTIFACT DETECTION ====================

/**
 * Artifact detection thresholds.
 * Based on Claude's approach: >15 lines or React/HTML.
 */
const ARTIFACT_CONFIG = {
    MIN_LINES: 15,
    REACT_LANGUAGES: ['tsx', 'jsx', 'react'],
    HTML_PATTERNS: ['<!DOCTYPE', '<html', '<head', '<body'],
} as const;

/**
 * Markdown document detection patterns.
 * Used to identify structured documents that should be artifacts.
 */
const MARKDOWN_DOC_CONFIG = {
    MIN_LINES: 15,
    // Content must have document structure
    HEADING_PATTERN: /^#{1,2}\s+.+/m,
    // Indicators of substantial document
    STRUCTURE_PATTERNS: [
        /^---\n[\s\S]*?\n---/m,      // YAML frontmatter
        />\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/m, // GH alerts
        /\|[^|]+\|[^|]+\|/,          // Tables
    ],
} as const;

/**
 * Determine if markdown should be elevated to an artifact.
 * 
 * Criteria:
 * - >15 lines
 * - Has heading structure (# or ##)
 * - Has multiple sections (2+ headings)
 */
function shouldElevateToMarkdownArtifact(content: string): boolean {
    const lines = content.split('\n').length;
    
    // Must be substantial
    if (lines < MARKDOWN_DOC_CONFIG.MIN_LINES) {
        return false;
    }
    
    // Must have heading structure
    const hasHeading = MARKDOWN_DOC_CONFIG.HEADING_PATTERN.test(content);
    if (!hasHeading) {
        return false;
    }
    
    // Must have multiple sections (document structure)
    const headingCount = (content.match(/^#{1,3}\s+.+/gm) || []).length;
    if (headingCount < 2) {
        return false;
    }
    
    return true;
}

/**
 * Generate title for markdown document from first heading or content.
 */
function generateMarkdownTitle(content: string): string {
    // Try to extract first H1 or H2
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match?.[1]) {
        return h1Match[1].trim().substring(0, 60);
    }
    
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match?.[1]) {
        return h2Match[1].trim().substring(0, 60);
    }
    
    return 'Markdown Document';
}

/**
 * Determine if a code block should be elevated to an artifact.
 * 
 * Criteria:
 * - Code >15 lines
 * - React/JSX/TSX (always)
 * - HTML with document structure
 */
function shouldElevateToArtifact(code: string, language: string): boolean {
    const normalizedLang = language.toLowerCase();
    const lines = code.split('\n').length;
    
    // React components always become artifacts
    if ((ARTIFACT_CONFIG.REACT_LANGUAGES as readonly string[]).includes(normalizedLang)) {
        return true;
    }
    
    // HTML with document structure
    if (normalizedLang === 'html' || normalizedLang === 'htm') {
        return ARTIFACT_CONFIG.HTML_PATTERNS.some(pattern => 
            code.includes(pattern)
        );
    }
    
    // Substantial code (>15 lines)
    if (lines > ARTIFACT_CONFIG.MIN_LINES) {
        return true;
    }
    
    return false;
}

/**
 * Generate artifact title from code content and language.
 */
function generateArtifactTitle(code: string, language: string): string {
    // Try to extract component/function/class name
    const patterns = [
        /export\s+(?:default\s+)?function\s+(\w+)/,
        /export\s+(?:default\s+)?class\s+(\w+)/,
        /const\s+(\w+)\s*=\s*(?:\([^)]*\)|)\s*=>/,
        /function\s+(\w+)\s*\(/,
        /class\s+(\w+)/,
        /def\s+(\w+)\s*\(/,
    ];
    
    for (const pattern of patterns) {
        const match = code.match(pattern);
        if (match?.[1]) {
            return match[1];
        }
    }
    
    // Fallback to language-based title
    return `${language.toUpperCase()} Code`;
}

// ==================== CODE FENCE & ARTIFACT TAG REGEX ====================

// Matches code fences: ```language\ncode\n``` (also handles language with hyphens)
const CODE_FENCE_REGEX = /```([\w-]*)\n([\s\S]*?)```/g;

// Matches explicit artifact tags from AI: <artifact type="..." title="...">content</artifact>
const ARTIFACT_TAG_REGEX = /<artifact\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/artifact>/g;

/**
 * Parse content that has explicit <artifact> tags.
 * Extracts artifacts and parses surrounding content normally.
 */
function parseWithExplicitArtifacts(
    content: string, 
    matches: RegExpMatchArray[], 
    options: ParseOptions
): RenderBlock[] {
    const blocks: RenderBlock[] = [];
    let lastIndex = 0;
    
    for (const match of matches) {
        const [fullMatch, type, title, artifactContent] = match;
        const matchStart = match.index ?? 0;
        
        // Parse content before this artifact tag
        if (matchStart > lastIndex) {
            const beforeContent = content.slice(lastIndex, matchStart).trim();
            if (beforeContent) {
                // Recursively parse, but disable artifact detection to avoid infinite loop
                const beforeBlocks = parseOutput(beforeContent, { ...options, detectArtifacts: false });
                blocks.push(...beforeBlocks);
            }
        }
        
        // Create the artifact block
        const artifactType = type as import('@/shared/rendering/schema').ArtifactType;
        const language = type === 'text/markdown' ? 'markdown' : 
                        type === 'application/vnd.ant.code' ? 'typescript' :
                        type === 'application/vnd.ant.react' ? 'tsx' : 'text';
        
        blocks.push(createArtifactBlock((artifactContent || '').trim(), language, title, artifactType));
        
        lastIndex = matchStart + fullMatch.length;
    }
    
    // Parse remaining content after last artifact
    if (lastIndex < content.length) {
        const afterContent = content.slice(lastIndex).trim();
        if (afterContent) {
            const afterBlocks = parseOutput(afterContent, { ...options, detectArtifacts: false });
            blocks.push(...afterBlocks);
        }
    }
    
    return blocks;
}

// ==================== PARSER ====================

/**
 * Parse AI output into RenderBlock[]
 *
 * Current implementation:
 * 1. First checks for explicit <artifact> tags (Claude-style)
 * 2. Then checks if entire content is a structured markdown document
 * 3. Finally splits on code fences for remaining content
 */
export function parseOutput(content: string, options: ParseOptions = {}): RenderBlock[] {
    if (!content || content.trim() === '') {
        return [];
    }

    if (options.resetSequence) {
        resetSequenceId();
    }

    // ========== PHASE 1: Extract explicit artifact tags ==========
    // These take priority - AI explicitly marked content as artifact
    const artifactMatches = [...content.matchAll(ARTIFACT_TAG_REGEX)];
    if (artifactMatches.length > 0) {
        return parseWithExplicitArtifacts(content, artifactMatches, options);
    }

    // ========== PHASE 2: Check if entire content is a structured document ==========
    // Before splitting on code fences, check if the whole thing is a markdown doc
    const detectArtifacts = options.detectArtifacts !== false;
    if (detectArtifacts && shouldElevateToMarkdownArtifact(content)) {
        const title = generateMarkdownTitle(content);
        return [createArtifactBlock(content, 'markdown', title, 'text/markdown')];
    }

    // ========== PHASE 3: Normal parsing with code fence splitting ==========
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
                } else if (options.detectArtifacts !== false && shouldElevateToMarkdownArtifact(markdownContent)) {
                    // Elevate substantial markdown to artifact
                    const title = generateMarkdownTitle(markdownContent);
                    blocks.push(createArtifactBlock(markdownContent, 'markdown', title, 'text/markdown'));
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
            // Check if this code should be elevated to an artifact
            const detectArtifacts = options.detectArtifacts !== false;
            if (detectArtifacts && shouldElevateToArtifact(trimmedCode, normalizedLang)) {
                const title = generateArtifactTitle(trimmedCode, language || 'text');
                blocks.push(createArtifactBlock(trimmedCode, language || 'text', title));
            } else {
                blocks.push(createCodeBlock(trimmedCode, language || 'text'));
            }
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
            } else if (options.detectArtifacts !== false && shouldElevateToMarkdownArtifact(remainingContent)) {
                // Elevate substantial markdown to artifact
                const title = generateMarkdownTitle(remainingContent);
                blocks.push(createArtifactBlock(remainingContent, 'markdown', title, 'text/markdown'));
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
        } else if (options.detectArtifacts !== false && shouldElevateToMarkdownArtifact(content)) {
            // Elevate substantial markdown to artifact
            const title = generateMarkdownTitle(content);
            blocks.push(createArtifactBlock(content, 'markdown', title, 'text/markdown'));
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

/**
 * Normalize quiz questions from various AI output formats to our schema.
 * 
 * AI might output:
 * - "question" instead of "prompt"
 * - "correct_answer" as letter ("A", "B", etc.) or full text
 * - "options" as object {"A": "...", "B": "..."} or array ["...", "..."]
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
            type: normalizeQuestionType(q.type),
            prompt: q.prompt || q.question || q.text || '',
            explanation: q.explanation,
        };

        // Handle options - could be array or object
        let optionsArray: string[] = [];
        if (Array.isArray(q.options)) {
            optionsArray = q.options;
        } else if (q.options && typeof q.options === 'object') {
            // Object format: {"A": "Option 1", "B": "Option 2", ...}
            // Convert to array, sorted by key
            const keys = Object.keys(q.options).sort();
            optionsArray = keys.map(k => q.options[k]);
        }
        
        if (optionsArray.length > 0) {
            normalized.options = optionsArray;
        }

        // Handle correct answer - multiple formats
        if (q.correctIndex !== undefined) {
            normalized.correctIndex = q.correctIndex;
        } else if (q.correct_index !== undefined) {
            normalized.correctIndex = q.correct_index;
        } else if (q.correct_answer !== undefined) {
            // correct_answer could be: "A", "B", "True", "False", or full text
            const answer = String(q.correct_answer).trim();
            
            // Check if it's a letter reference (A, B, C, D)
            if (/^[A-Da-d]$/.test(answer)) {
                const letterIndex = answer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
                if (letterIndex >= 0 && letterIndex < optionsArray.length) {
                    normalized.correctIndex = letterIndex;
                }
            } else if (optionsArray.length > 0) {
                // Try to find by matching text
                const idx = optionsArray.findIndex((opt: string) => 
                    opt.toLowerCase().trim() === answer.toLowerCase()
                );
                if (idx !== -1) {
                    normalized.correctIndex = idx;
                } else {
                    // Store as correctAnswer for short answer types
                    normalized.correctAnswer = answer;
                }
            } else {
                // No options, use as direct answer (true/false or short answer)
                normalized.correctAnswer = answer;
            }
        } else if (q.correctAnswer !== undefined) {
            normalized.correctAnswer = q.correctAnswer;
        }

        // For true/false, ensure we have proper handling
        if (normalized.type === 'true_false' && !normalized.options) {
            normalized.options = ['True', 'False'];
            if (normalized.correctAnswer) {
                const answer = normalized.correctAnswer.toLowerCase();
                normalized.correctIndex = answer === 'true' ? 0 : 1;
                delete normalized.correctAnswer;
            }
        }

        return normalized;
    }).filter(q => q.prompt); // Filter out empty questions
}

/**
 * Normalize question type from AI output to our schema.
 */
function normalizeQuestionType(type: string | undefined): 'multiple_choice' | 'true_false' | 'short_answer' {
    if (!type) return 'multiple_choice';
    
    const normalized = type.toLowerCase().replace(/[_-]/g, '');
    
    if (normalized.includes('truefalse') || normalized === 'tf' || normalized === 'boolean') {
        return 'true_false';
    }
    if (normalized.includes('shortanswer') || normalized.includes('openended') || normalized.includes('freeform')) {
        return 'short_answer';
    }
    return 'multiple_choice';
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
