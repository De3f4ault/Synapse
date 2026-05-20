/**
 * parseOutput - Engine for AI Output → RenderBlock[]
 *
 * INVARIANT: Pure function, no side effects.
 * INVARIANT: Belongs to engine layer (parsing), not rendering layer.
 *
 * DESIGN: Artifacts are ONLY emitted explicitly by the backend via the
 * `data-artifact` SSE stream part (SDK DataUIPart system). This parser
 * NEVER auto-elevates content to artifact cards — that was causing every
 * long markdown response to appear as a downloadable file card.
 *
 * What this parser handles:
 *   - Markdown text → MarkdownBlock
 *   - ```code``` fences → CodeBlock
 *   - ```mermaid → MermaidBlock
 *   - ```synapse-flashcards JSON → FlashcardSetBlock
 *   - ```synapse-quiz JSON → QuizBlock
 *   - JSON with quiz/flashcard structure → QuizBlock / FlashcardSetBlock
 *   - Markdown tables with FRONT/BACK headers → FlashcardSetBlock
 *   - <artifact> tags (explicit from AI prompt) → ArtifactBlock (only this path)
 *
 * What this parser NO LONGER does:
 *   - Auto-elevate long markdown to artifact cards  ← removed
 *   - Auto-elevate code blocks >40 lines to artifact cards  ← removed
 *   - Auto-elevate React/HTML code to artifact cards  ← removed
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
}

// ==================== CODE FENCE & ARTIFACT TAG REGEX ====================

// Matches code fences: ```language\ncode\n``` (also handles language with hyphens)
const CODE_FENCE_REGEX = /```([\w-]*)\n([\s\S]*?)```/g;

// Matches explicit artifact tags from AI: <artifact type="..." title="...">content</artifact>
const ARTIFACT_TAG_REGEX = /<artifact\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/artifact>/g;

/**
 * Parse content that has explicit <artifact> tags.
 * This is the ONLY path that creates artifact blocks.
 * AI must explicitly mark content with <artifact> tags.
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
                const beforeBlocks = parseOutput(beforeContent, options);
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
            const afterBlocks = parseOutput(afterContent, options);
            blocks.push(...afterBlocks);
        }
    }

    return blocks;
}

// ==================== PARSER ====================

/**
 * Parse AI output into RenderBlock[]
 *
 * 1. Check for explicit <artifact> tags (only path to ArtifactBlock)
 * 2. Split on code fences
 * 3. Route each segment: mermaid / synapse-* study blocks / code / markdown
 */
export function parseOutput(content: string, options: ParseOptions = {}): RenderBlock[] {
    if (!content || content.trim() === '') {
        return [];
    }

    if (options.resetSequence) {
        resetSequenceId();
    }

    // ── PHASE 1: Explicit <artifact> tags only ──────────────────────────
    const artifactMatches = [...content.matchAll(ARTIFACT_TAG_REGEX)];
    if (artifactMatches.length > 0) {
        return parseWithExplicitArtifacts(content, artifactMatches, options);
    }

    // ── PHASE 2: Code fence splitting ───────────────────────────────────
    const blocks: RenderBlock[] = [];
    let lastIndex = 0;
    const matches = [...content.matchAll(CODE_FENCE_REGEX)];

    for (const match of matches) {
        const [fullMatch, language, code] = match;
        const matchStart = match.index ?? 0;

        // Markdown content before this code fence
        if (matchStart > lastIndex) {
            const markdownContent = content.slice(lastIndex, matchStart).trim();
            if (markdownContent) {
                const tableResult = parseFlashcardTable(markdownContent);
                if (tableResult) {
                    blocks.push(tableResult);
                } else {
                    // Always render as markdown — no auto-artifact elevation
                    blocks.push(createMarkdownBlock(markdownContent));
                }
            }
        }

        const trimmedCode = (code ?? '').trim();
        const normalizedLang = (language || 'text').toLowerCase();

        // Study blocks: synapse-flashcards / synapse-quiz
        if (normalizedLang === 'synapse-flashcards') {
            try {
                const data = JSON.parse(trimmedCode);
                blocks.push(createFlashcardSetBlock(
                    data.title || 'Flashcard Set',
                    Array.isArray(data.cards) ? data.cards : []
                ));
            } catch {
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
            // All other code → CodeBlock. No artifact auto-elevation.
            blocks.push(createCodeBlock(trimmedCode, language || 'text'));
        }

        lastIndex = matchStart + fullMatch.length;
    }

    // Remaining content after last code fence
    if (lastIndex < content.length) {
        const remainingContent = content.slice(lastIndex).trim();
        if (remainingContent) {
            const tableResult = parseFlashcardTable(remainingContent);
            if (tableResult) {
                blocks.push(tableResult);
            } else {
                blocks.push(createMarkdownBlock(remainingContent));
            }
        }
    }

    // If no code fences found, handle entire content
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
 * Detect and parse markdown tables with FRONT/BACK, QUESTION/ANSWER headers.
 * Returns FlashcardSetBlock if detected, null otherwise.
 */
function parseFlashcardTable(content: string): RenderBlock | null {
    const tableHeaderPatterns = [
        /\|\s*#?\s*\|\s*(?:FRONT|Question|Prompt|Term)\s*(?:\([^)]*\))?\s*\|\s*(?:BACK|Answer|Definition)\s*(?:\([^)]*\))?\s*\|/i,
        /\|\s*(?:FRONT|Question|Prompt|Term)\s*\|\s*(?:BACK|Answer|Definition)\s*\|/i,
    ];

    const hasFlashcardHeader = tableHeaderPatterns.some(pattern => pattern.test(content));
    if (!hasFlashcardHeader) {
        return null;
    }

    const titleMatch = content.match(/^(?:\*\*)?([^|\n*]+?)(?:\*\*)?\s*\n/);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : 'Flashcard Set';

    const lines = content.split('\n');
    const cards: Array<{ front: string; back: string }> = [];

    let inTable = false;
    let frontIndex = -1;
    let backIndex = -1;

    for (const line of lines) {
        if (!line.trim()) continue;

        if (line.includes('|') && !inTable) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);

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

        if (inTable && /^\s*\|[\s:-]+\|\s*$/.test(line.replace(/[^|:-\s]/g, ''))) {
            continue;
        }

        if (inTable && line.includes('|')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
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

    if (cards.length > 0) {
        return createFlashcardSetBlock(title, cards);
    }

    return null;
}

/**
 * Normalize quiz questions from various AI output formats to our schema.
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

        let optionsArray: string[] = [];
        if (Array.isArray(q.options)) {
            optionsArray = q.options;
        } else if (q.options && typeof q.options === 'object') {
            const keys = Object.keys(q.options).sort();
            optionsArray = keys.map(k => q.options[k]);
        }

        if (optionsArray.length > 0) {
            normalized.options = optionsArray;
        }

        if (q.correctIndex !== undefined) {
            normalized.correctIndex = q.correctIndex;
        } else if (q.correct_index !== undefined) {
            normalized.correctIndex = q.correct_index;
        } else if (q.correct_answer !== undefined) {
            const answer = String(q.correct_answer).trim();
            if (/^[A-Da-d]$/.test(answer)) {
                const letterIndex = answer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
                if (letterIndex >= 0 && letterIndex < optionsArray.length) {
                    normalized.correctIndex = letterIndex;
                }
            } else if (optionsArray.length > 0) {
                const idx = optionsArray.findIndex((opt: string) =>
                    opt.toLowerCase().trim() === answer.toLowerCase()
                );
                if (idx !== -1) {
                    normalized.correctIndex = idx;
                } else {
                    normalized.correctAnswer = answer;
                }
            } else {
                normalized.correctAnswer = answer;
            }
        } else if (q.correctAnswer !== undefined) {
            normalized.correctAnswer = q.correctAnswer;
        }

        if (normalized.type === 'true_false' && !normalized.options) {
            normalized.options = ['True', 'False'];
            if (normalized.correctAnswer) {
                const answer = normalized.correctAnswer.toLowerCase();
                normalized.correctIndex = answer === 'true' ? 0 : 1;
                delete normalized.correctAnswer;
            }
        }

        return normalized;
    }).filter(q => q.prompt);
}

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
 */
function parseStudyJSON(jsonStr: string): RenderBlock | null {
    try {
        const data = JSON.parse(jsonStr);

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            const firstQ = data.questions[0];
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

// ==================== UTILITIES ====================

export function hasCodeFences(content: string): boolean {
    return CODE_FENCE_REGEX.test(content);
}

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
