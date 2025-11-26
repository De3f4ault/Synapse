import type { GraphNode, GraphLink } from '../types/graph.types';
import type {
    DocumentResponse,
    NoteResponse,
    FlashcardResponse,
    ChatSessionResponse,
    QuizResponse
} from '@/api/generated/types.gen';
import type { DashboardData } from '../types/dashboard.types';
import { MODULE_COLORS } from '../constants/colors';

/**
 * Graph Transformers
 *
 * Transforms API data into D3-compatible graph structures:
 * - Converts resources to nodes with metadata
 * - Infers connections between resources
 * - Calculates node sizes and colors
 *
 * FIXED: Added defensive programming to handle invalid/missing data
 */

// Transform documents to graph nodes
// FIXED: Add array validation
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
        color: MODULE_COLORS.documents,
        metadata: {
            id: doc.id,
            filename: doc.filename,
            fileType: doc.file_type,
            fileSize: doc.file_size,
            pageCount: doc.page_count,
            wordCount: doc.word_count,
            processingStatus: doc.processing_status,
            createdAt: doc.created_at,
        },
        x: 0,
        y: 0,
    }));
}

// Transform notes to graph nodes
// FIXED: Add array validation
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
        color: MODULE_COLORS.notes,
        metadata: {
            id: note.id,
            title: note.title,
            contentLength: note.content?.length || 0,
            format: note.format,
                parentId: note.parent_id,
                childrenCount: note.children_count,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
        },
        x: 0,
        y: 0,
    }));
}

// Transform flashcards to graph nodes
// FIXED: Add array validation
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
                     },
                     x: 0,
                     y: 0,
        };
    });
}

// Transform chat sessions to graph nodes
// FIXED: Add array validation
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
        },
        x: 0,
        y: 0,
    }));
}

// Transform quizzes to graph nodes
// FIXED: Add array validation
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
        color: MODULE_COLORS.quizzes,
        metadata: {
            id: quiz.id,
            title: quiz.title,
            difficulty: quiz.difficulty,
            questionCount: quiz.question_count,
            timeLimitMinutes: quiz.time_limit_minutes,
            createdAt: quiz.created_at,
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
    // This is a heuristic: if a note was created shortly after a document was uploaded, they're likely related
    // FIXED: Add array validation
    if (data.documents && Array.isArray(data.documents) && data.notes && Array.isArray(data.notes)) {
        data.notes.forEach(note => {
            // Check if note content mentions any document filename
            data.documents?.forEach(doc => {
                const docFilename = doc.filename || '';
                const docFilenameBase = docFilename.split('.')[0].toLowerCase();
                const noteTitle = (note.title || '').toLowerCase();
                const noteContent = (note.content || '').toLowerCase();

                if (noteTitle.includes(docFilenameBase) || noteContent.includes(docFilenameBase)) {
                    links.push({
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
    // FIXED: Add array validation
    if (data.notes && Array.isArray(data.notes)) {
        data.notes.forEach(note => {
            if (note.parent_id) {
                links.push({
                    source: `note-${note.parent_id}`,
                    target: `note-${note.id}`,
                    type: 'hierarchy',
                    strength: 1.0,
                });
            }
        });
    }

    // 3. Note → Flashcard connections (flashcards generated from notes)
    // Heuristic: if flashcard belongs to a deck with similar name to note
    // FIXED: Add array validation
    if (data.notes && Array.isArray(data.notes) &&
        data.dueCards && Array.isArray(data.dueCards) &&
        data.decks && Array.isArray(data.decks)) {
        data.dueCards.forEach(card => {
            const deck = data.decks?.find(d => d.id === card.deck_id);
            if (deck) {
                data.notes?.forEach(note => {
                    const noteTitleLower = (note.title || '').toLowerCase();
                    const deckNameLower = (deck.name || '').toLowerCase();
                    if (noteTitleLower.includes(deckNameLower) ||
                        deckNameLower.includes(noteTitleLower)) {
                        links.push({
                            source: `note-${note.id}`,
                            target: `card-${card.id}`,
                            type: 'generated_from',
                            strength: 0.6,
                        });
                        }
                });
            }
        });
        }

        // 4. Chat → Document connections (chat sessions with document context)
        // FIXED: Add array validation
        if (data.chatSessions && Array.isArray(data.chatSessions) &&
            data.documents && Array.isArray(data.documents)) {
            data.chatSessions.forEach(chat => {
                if (chat.document_id) {
                    links.push({
                        source: `doc-${chat.document_id}`,
                        target: `chat-${chat.id}`,
                        type: 'referenced_in',
                        strength: 0.9,
                    });
                }
            });
            }

            // 5. Flashcard → Flashcard connections (same deck)
            // FIXED: Add array validation
            if (data.dueCards && Array.isArray(data.dueCards)) {
                const cardsByDeck = data.dueCards.reduce((acc, card) => {
                    if (!acc[card.deck_id]) acc[card.deck_id] = [];
                    acc[card.deck_id].push(card);
                    return acc;
                }, {} as Record<number, FlashcardResponse[]>);

                Object.values(cardsByDeck).forEach(deckCards => {
                    // Connect cards in same deck (limit to avoid clutter)
                    for (let i = 0; i < Math.min(deckCards.length - 1, 3); i++) {
                        links.push({
                            source: `card-${deckCards[i].id}`,
                            target: `card-${deckCards[i + 1].id}`,
                            type: 'same_deck',
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
// FIXED: Add default values for all metrics
function calculateNodeSize(
    type: string,
    metrics: Record<string, any>
): number {
    const baseSize = 8;
    const maxSize = 24;

    switch (type) {
        case 'document':
            // Size by page count
            const pageScore = Math.min((metrics.pageCount || 0) / 100, 1);
            return baseSize + (maxSize - baseSize) * pageScore;

        case 'note':
            // Size by content length and children
            const contentScore = Math.min((metrics.contentLength || 0) / 5000, 0.7);
            const childrenScore = metrics.hasChildren ? 0.3 : 0;
            return baseSize + (maxSize - baseSize) * (contentScore + childrenScore);

        case 'flashcard':
            // Size by review count and accuracy
            const reviewScore = Math.min((metrics.timesReviewed || 0) / 50, 0.6);
            const accuracyScore = (metrics.accuracy || 0) * 0.4;
            return baseSize + (maxSize - baseSize) * (reviewScore + accuracyScore);

        case 'chat':
            // Size by message count
            const messageScore = Math.min((metrics.messageCount || 0) / 100, 1);
            return baseSize + (maxSize - baseSize) * messageScore;

        case 'quiz':
            // Size by question count and difficulty
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
// FIXED: Add default value for accuracy
function getFlashcardColor(learningState: string, accuracy: number): string {
    const safeAccuracy = accuracy || 0;

    if (learningState === 'mastered') {
        return MODULE_COLORS.flashcards; // Green for mastered
    } else if (learningState === 'learning') {
        return '#3b82f6'; // Blue for learning
    } else if (safeAccuracy < 0.5) {
        return '#ef4444'; // Red for low accuracy
    } else if (safeAccuracy < 0.7) {
        return '#f59e0b'; // Orange for medium accuracy
    }
    return MODULE_COLORS.flashcards;
}
