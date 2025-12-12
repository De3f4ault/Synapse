import { useMemo, useCallback } from 'react';
import type { DashboardData } from '../types/dashboard.types';
import type { PriorityItem, PrioritySection } from '../types/priority.types';
import { calculatePriority } from '../utils/priorityCalculator';
import { formatDueDate } from '../utils/dateFormatters';

/**
 * useFocusQueue Hook
 *
 * Builds and manages the prioritized action queue:
 * - Aggregates actionable items from all modules
 * - Calculates smart priorities
 * - Groups items into sections (Due Today, High Priority, Recommended, Later)
 * - Provides actions (dismiss, snooze, navigate)
 *
 * FIXED: Added defensive programming to handle invalid/missing data
 */
export function useFocusQueue(data: DashboardData | undefined) {
    // Build complete queue from all sources
    const allPriorityItems = useMemo((): PriorityItem[] => {
        if (!data) return [];

        const items: PriorityItem[] = [];

        // 1. Due flashcards (highest urgency)
        // FIXED: Check if dueCards is an array before using forEach
        if (data.dueCards && Array.isArray(data.dueCards)) {
            data.dueCards.forEach(card => {
                const priority = calculatePriority({
                    dueDate: card.next_review,
                    isWeakArea: (card.accuracy || 0) < 0.7,
                                                   accuracy: card.accuracy || 0,
                                                   hasPrerequisites: false,
                                                   lastAccessed: null,
                });

                items.push({
                    id: `card-${card.id}`,
                    type: 'flashcard',
                    moduleType: 'flashcards',
                    title: card.front_text || 'Untitled Card',
                    description: `Review flashcard • ${card.times_reviewed || 0} reviews`,
                    priority,
                    dueDate: card.next_review || undefined,
                    estimatedMinutes: 2,
                    metadata: {
                        cardId: card.id,
                        deckId: card.deck_id,
                        accuracy: card.accuracy,
                        learningState: card.learning_state,
                    },
                    actionUrl: `/flashcards/review?card=${card.id}`,
                });
            });
        }

        // 2. Incomplete notes (notes with little content)
        // FIXED: Check if notes is an array
        if (data.notes && Array.isArray(data.notes)) {
            data.notes
            .filter(note => (note.content?.length || 0) < 200)
            .forEach(note => {
                const priority = calculatePriority({
                    dueDate: null,
                    isWeakArea: false,
                    accuracy: 1,
                    hasPrerequisites: false,
                    lastAccessed: note.updated_at,
                });

                items.push({
                    id: `note-${note.id}`,
                    type: 'note',
                    moduleType: 'notes',
                    title: note.title || 'Untitled Note',
                    description: `Expand note • ${note.content?.length || 0} characters`,
                    priority,
                    estimatedMinutes: 10,
                    metadata: {
                        noteId: note.id,
                        contentLength: note.content?.length || 0,
                        format: note.format,
                    },
                    actionUrl: `/notes/${note.id}`,
                });
            });
        }

        // 3. Unprocessed documents
        // FIXED: Check if documents is an array
        if (data.documents && Array.isArray(data.documents)) {
            data.documents
            .filter(doc => doc.processing_status === 'completed' && !doc.gemini_file_uri)
            .forEach(doc => {
                const priority = calculatePriority({
                    dueDate: null,
                    isWeakArea: false,
                    accuracy: 1,
                    hasPrerequisites: false,
                    lastAccessed: doc.created_at,
                });

                items.push({
                    id: `doc-${doc.id}`,
                    type: 'document',
                    moduleType: 'documents',
                    title: doc.filename || 'Untitled Document',
                    description: `Process document • ${doc.page_count || 0} pages`,
                    priority,
                    estimatedMinutes: 15,
                    metadata: {
                        documentId: doc.id,
                        fileType: doc.file_type,
                        pageCount: doc.page_count,
                    },
                    actionUrl: `/documents/${doc.id}`,
                });
            });
        }

        // 4. Pending quizzes
        // FIXED: Check if quizzes is an array
        if (data.quizzes && Array.isArray(data.quizzes)) {
            data.quizzes.forEach(quiz => {
                const priority = 0.6; // Medium priority for quizzes

                items.push({
                    id: `quiz-${quiz.id}`,
                    type: 'quiz',
                    moduleType: 'quizzes',
                    title: quiz.title || 'Untitled Quiz',
                    description: `${quiz.difficulty || 'medium'} quiz • ${quiz.question_count || 0} questions`,
                    priority,
                    estimatedMinutes: quiz.time_limit_minutes || 15,
                    metadata: {
                        quizId: quiz.id,
                        difficulty: quiz.difficulty,
                        questionCount: quiz.question_count,
                    },
                    actionUrl: `/quizzes/${quiz.id}/start`,
                });
            });
        }

        // Sort by priority (highest first)
        return items.sort((a, b) => b.priority - a.priority);
    }, [data]);

    // Group items into sections
    const sections = useMemo((): PrioritySection[] => {
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Due Today section (items due within today)
        const dueToday = allPriorityItems.filter(item => {
            if (!item.dueDate) return false;
            const dueDate = new Date(item.dueDate);
            return dueDate <= todayEnd;
        });

        // High Priority section (priority > 0.7, not due today)
        const highPriority = allPriorityItems.filter(item =>
        item.priority > 0.7 &&
        !dueToday.some(d => d.id === item.id)
        );

        // Recommended section (priority 0.4-0.7)
        const recommended = allPriorityItems.filter(item =>
        item.priority >= 0.4 &&
        item.priority <= 0.7 &&
        !dueToday.some(d => d.id === item.id) &&
        !highPriority.some(h => h.id === item.id)
        );

        // Later section (priority < 0.4)
        const later = allPriorityItems.filter(item =>
        item.priority < 0.4 &&
        !dueToday.some(d => d.id === item.id) &&
        !highPriority.some(h => h.id === item.id) &&
        !recommended.some(r => r.id === item.id)
        );

        return [
            {
                id: 'due-today',
                title: 'Due Today',
                items: dueToday,
                color: 'red',
                priority: 4,
            },
            {
                id: 'high-priority',
                title: 'High Priority',
                items: highPriority,
                color: 'orange',
                priority: 3,
            },
            {
                id: 'recommended',
                title: 'Recommended',
                items: recommended,
                color: 'blue',
                priority: 2,
            },
            {
                id: 'later',
                title: 'Later',
                items: later,
                color: 'gray',
                priority: 1,
            },
        ].filter(section => section.items.length > 0); // Only show non-empty sections
    }, [allPriorityItems]);

    // Queue statistics
    const stats = useMemo(() => {
        return {
            totalItems: allPriorityItems.length,
            dueToday: sections.find(s => s.id === 'due-today')?.items.length || 0,
                          highPriority: sections.find(s => s.id === 'high-priority')?.items.length || 0,
                          estimatedTotalMinutes: allPriorityItems.reduce((sum, item) =>
                          sum + (item.estimatedMinutes || 0), 0
                          ),
                          byModule: {
                              flashcards: allPriorityItems.filter(i => i.moduleType === 'flashcards').length,
                          notes: allPriorityItems.filter(i => i.moduleType === 'notes').length,
                          documents: allPriorityItems.filter(i => i.moduleType === 'documents').length,
                          quizzes: allPriorityItems.filter(i => i.moduleType === 'quizzes').length,
                          },
        };
    }, [allPriorityItems, sections]);

    // Actions
    const dismissItem = useCallback((itemId: string) => {
        // TODO: Implement dismiss logic (store in localStorage or backend)
        console.log('Dismiss item:', itemId);
    }, []);

    const snoozeItem = useCallback((itemId: string, hours: number) => {
        // TODO: Implement snooze logic
        console.log('Snooze item:', itemId, 'for', hours, 'hours');
    }, []);

    return {
        sections,
        allItems: allPriorityItems,
        stats,
        dismissItem,
        snoozeItem,
        isLoading: !data,
        isEmpty: allPriorityItems.length === 0,
    };
}
