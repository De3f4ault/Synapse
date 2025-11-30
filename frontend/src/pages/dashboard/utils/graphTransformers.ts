import type { GraphNode, GraphLink } from '../types/graph.types';
import type {
    DocumentResponse,
    NoteResponse,
    FlashcardResponse,
    ChatSessionResponse,
    QuizResponse
} from '@/api/generated/types.gen';
import type { DashboardData } from '../types/dashboard.types';

/**
 * Graph Transformers
 *
 * Transforms API data into D3-compatible graph structures
 * FIXED:
 * - Uses correct color keys from MODULE_COLORS (document/note/flashcard not plural)
 * - Added defensive programming for all array checks
 * - Removed dependency on data.decks (not in DashboardData)
 */

// Module color mapping (matching colors.ts structure)
const MODULE_COLORS = {
    document: '#3b82f6', // Blue
    note: '#a855f7',     // Purple
    flashcard: '#10b981', // Green
    chat: '#06b6d4',     // Cyan
    quiz: '#f59e0b',     // Orange
} as const;

// Transform documents to graph nodes
export function transformDocumentsToNodes(documents: DocumentResponse[] | undefined | null): GraphNode[] {
    if (!documents || !Array.isArray(documents)) {
        console.warn('[graphTransformers] Invalid documents data:', documents);
        return [];
    }

    return documents.map(doc => ({
        id: `doc-${doc.id}`,
        type: 'document',
        label: doc.filename || 'Untitled Document',
        size: calculateNodeSize('document', {
            pageCount: doc.page_count || 0,
            wordCount: doc.word_count || 0,
        }),
        color: MODULE_COLORS.document,
        metadata: {
            id: doc.id,
            filename: doc.filename,
            fileType: doc.file_type,
            fileSize: doc.file_size,
            pageCount: doc.page_count,
            wordCount: doc.word_count,
            processingStatus: doc.processing_status,
            createdAt: doc.created_at,
            moduleId: doc.id,
            created: doc.created_at,
            connections: 0,
        },
        x: 0,
        y: 0,
    }));
}

// Transform notes to graph nodes
export function transformNotesToNodes(notes: NoteResponse[] | undefined | null): GraphNode[] {
    if (!notes || !Array.isArray(notes)) {
        console.warn('[graphTransformers] Invalid notes data:', notes);
        return [];
    }

    return notes.map(note => ({
        id: `note-${note.id}`,
        type: 'note',
        label: note.title || 'Untitled Note',
        size: calculateNodeSize('note', {
            contentLength: note.content?.length || 0,
            hasChildren: (note.children_count || 0) > 0,
        }),
        color: MODULE_COLORS.note,
        metadata: {
            id: note.id,
            title: note.title,
            contentLength: note.content?.length || 0,
            format: note.format,
                parentId: note.parent_id,
                childrenCount: note.children_count,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
                moduleId: note.id,
                created: note.created_at,
                connections: 0,
        },
        x: 0,
        y: 0,
    }));
}

// Transform flashcards to graph nodes
export function transformFlashcardsToNodes(cards: FlashcardResponse[] | undefined | null): GraphNode[] {
    if (!cards || !Array.isArray(cards)) {
        console.warn('[graphTransformers] Invalid cards data:', cards);
        return [];
    }

    return cards.map(card => {
        const frontText = card.front_text || 'Untitled Card';
        const label = frontText.substring(0, 30) + (frontText.length > 30 ? '...' : '');

        return {
            id: `card-${card.id}`,
            type: 'flashcard',
            label,
            size: calculateNodeSize('flashcard', {
                timesReviewed: card.times_reviewed || 0,
                accuracy: card.accuracy || 0,
                learningState: card.learning_state,
            }),
            color: getFlashcardColor(card.learning_state, card.accuracy || 0),
                     metadata: {
                         id: card.id,
                         deckId: card.deck_id,
                         frontText: card.front_text,
                         timesReviewed: card.times_reviewed,
                         accuracy: card.accuracy,
                         learningState: card.learning_state,
                         nextReview: card.next_review,
                         moduleId: card.id,
                         created: card.created_at || new Date().toISOString(),
                     connections: 0,
                     mastery: card.accuracy,
                     },
                     x: 0,
                     y: 0,
        };
    });
}

// Transform chat sessions to graph nodes
export function transformChatsToNodes(chats: ChatSessionResponse[] | undefined | null): GraphNode[] {
    if (!chats || !Array.isArray(chats)) {
        console.warn('[graphTransformers] Invalid chats data:', chats);
        return [];
    }

    return chats.map(chat => ({
        id: `chat-${chat.id}`,
        type: 'chat',
        label: chat.title || 'Untitled Chat',
        size: calculateNodeSize('chat', {
            messageCount: chat.message_count || 0,
            totalTokens: chat.total_tokens || 0,
        }),
        color: MODULE_COLORS.chat,
        metadata: {
            id: chat.id,
            title: chat.title,
            messageCount: chat.message_count,
            totalTokens: chat.total_tokens,
            documentId: chat.document_id,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
            moduleId: chat.id,
            created: chat.created_at,
            connections: 0,
        },
        x: 0,
        y: 0,
    }));
}

// Transform quizzes to graph nodes
export function transformQuizzesToNodes(quizzes: QuizResponse[] | undefined | null): GraphNode[] {
    if (!quizzes || !Array.isArray(quizzes)) {
        console.warn('[graphTransformers] Invalid quizzes data:', quizzes);
        return [];
    }

    return quizzes.map(quiz => ({
        id: `quiz-${quiz.id}`,
        type: 'quiz',
        label: quiz.title || 'Untitled Quiz',
        size: calculateNodeSize('quiz', {
            questionCount: quiz.question_count || 0,
            difficulty: quiz.difficulty,
        }),
        color: MODULE_COLORS.quiz,
        metadata: {
            id: quiz.id,
            title: quiz.title,
            difficulty: quiz.difficulty,
            questionCount: quiz.question_count,
            timeLimitMinutes: quiz.time_limit_minutes,
            createdAt: quiz.created_at,
            moduleId: quiz.id,
            created: quiz.created_at,
            connections: 0,
        },
        x: 0,
        y: 0,
    }));
}

// Infer connections between nodes
export function inferConnections(nodes: GraphNode[], data: DashboardData | undefined): GraphLink[] {
    if (!data) return [];

    const links: GraphLink[] = [];

    // 1. Document → Note connections (notes created from documents)
    if (data.documents && Array.isArray(data.documents) && data.notes && Array.isArray(data.notes)) {
        data.notes.forEach(note => {
            data.documents?.forEach(doc => {
                const docFilename = doc.filename || '';
                const docFilenameBase = docFilename.split('.')[0].toLowerCase();
                const noteTitle = (note.title || '').toLowerCase();
                const noteContent = (note.content || '').toLowerCase();

                if (noteTitle.includes(docFilenameBase) || noteContent.includes(docFilenameBase)) {
                    links.push({
                        id: `doc-${doc.id}-note-${note.id}`,
                        source: `doc-${doc.id}`,
                        target: `note-${note.id}`,
                        type: 'derived_from',
                        strength: 0.8,
                    });
                }
            });
        });
    }

    // 2. Note → Note connections (parent-child relationships)
    if (data.notes && Array.isArray(data.notes)) {
        data.notes.forEach(note => {
            if (note.parent_id) {
                links.push({
                    id: `note-${note.parent_id}-note-${note.id}`,
                    source: `note-${note.parent_id}`,
                    target: `note-${note.id}`,
                    type: 'related_to',
                    strength: 1.0,
                });
            }
        });
    }

    // 3. Note → Flashcard connections (heuristic based on similar titles)
    if (data.notes && Array.isArray(data.notes) && data.dueCards && Array.isArray(data.dueCards)) {
        data.dueCards.forEach(card => {
            const cardText = (card.front_text || '').toLowerCase();

            data.notes?.forEach(note => {
                const noteTitleLower = (note.title || '').toLowerCase();
                const noteContentLower = (note.content || '').toLowerCase();

                // Check if card text appears in note
                if (cardText.length > 10 && (noteContentLower.includes(cardText) || noteTitleLower.includes(cardText))) {
                    links.push({
                        id: `note-${note.id}-card-${card.id}`,
                        source: `note-${note.id}`,
                        target: `card-${card.id}`,
                        type: 'generated_from',
                        strength: 0.6,
                    });
                }
            });
        });
    }

    // 4. Chat → Document connections (chat sessions with document context)
    if (data.chatSessions && Array.isArray(data.chatSessions) && data.documents && Array.isArray(data.documents)) {
        data.chatSessions.forEach(chat => {
            if (chat.document_id) {
                links.push({
                    id: `doc-${chat.document_id}-chat-${chat.id}`,
                    source: `doc-${chat.document_id}`,
                    target: `chat-${chat.id}`,
                    type: 'referenced_in',
                    strength: 0.9,
                });
            }
        });
    }

    // 5. Flashcard → Flashcard connections (same deck - limit to avoid clutter)
    if (data.dueCards && Array.isArray(data.dueCards)) {
        const cardsByDeck = data.dueCards.reduce((acc, card) => {
            if (!acc[card.deck_id]) acc[card.deck_id] = [];
            acc[card.deck_id].push(card);
            return acc;
        }, {} as Record<number, FlashcardResponse[]>);

        Object.values(cardsByDeck).forEach(deckCards => {
            // Connect first 3 cards in same deck
            for (let i = 0; i < Math.min(deckCards.length - 1, 2); i++) {
                links.push({
                    id: `card-${deckCards[i].id}-card-${deckCards[i + 1].id}`,
                    source: `card-${deckCards[i].id}`,
                    target: `card-${deckCards[i + 1].id}`,
                    type: 'related_to',
                    strength: 0.3,
                });
            }
        });
    }

    // Remove duplicate links
    const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l =>
    l.source === link.source &&
    l.target === link.target &&
    l.type === link.type
    )
    );

    return uniqueLinks;
}

// Calculate node size based on importance metrics
function calculateNodeSize(
    type: string,
    metrics: Record<string, any>
): number {
    const baseSize = 8;
    const maxSize = 24;

    switch (type) {
        case 'document':
            const pageScore = Math.min((metrics.pageCount || 0) / 100, 1);
            return baseSize + (maxSize - baseSize) * pageScore;

        case 'note':
            const contentScore = Math.min((metrics.contentLength || 0) / 5000, 0.7);
            const childrenScore = metrics.hasChildren ? 0.3 : 0;
            return baseSize + (maxSize - baseSize) * (contentScore + childrenScore);

        case 'flashcard':
            const reviewScore = Math.min((metrics.timesReviewed || 0) / 50, 0.6);
            const accuracyScore = (metrics.accuracy || 0) * 0.4;
            return baseSize + (maxSize - baseSize) * (reviewScore + accuracyScore);

        case 'chat':
            const messageScore = Math.min((metrics.messageCount || 0) / 100, 1);
            return baseSize + (maxSize - baseSize) * messageScore;

        case 'quiz':
            const questionScore = Math.min((metrics.questionCount || 0) / 50, 0.7);
            const difficultyScore =
            metrics.difficulty === 'hard' ? 0.3 :
            metrics.difficulty === 'medium' ? 0.2 : 0.1;
            return baseSize + (maxSize - baseSize) * (questionScore + difficultyScore);

        default:
            return baseSize;
    }
}

// Get flashcard color based on learning state and accuracy
function getFlashcardColor(learningState: string, accuracy: number): string {
    const safeAccuracy = accuracy || 0;

    if (learningState === 'mastered') {
        return MODULE_COLORS.flashcard; // Green for mastered
    } else if (learningState === 'learning') {
        return '#3b82f6'; // Blue for learning
    } else if (safeAccuracy < 0.5) {
        return '#ef4444'; // Red for low accuracy
    } else if (safeAccuracy < 0.7) {
        return '#f59e0b'; // Orange for medium accuracy
    }
    return MODULE_COLORS.flashcard;
}
