/**
 * FlashcardsPage - Pure Orchestration
 *
 * Added Phase C: Collections sidebar state + deck filtering by collection.
 * Deck.collection_id is used to filter when a collection is selected.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

// Module public APIs
import { useDecks, useDeleteDeck, useDeckListStore } from './list';
import { DeckCreator } from './create';
import { ImportModal } from './components/ImportModal';
import { FlashcardsHub } from './components/FlashcardsHub';
import { CollectionsService } from '@/api/generated';
import type { Deck } from './core';

// ─── Collection type (from API) ────────────────────────────
interface Collection {
  id: number;
  name: string;
  deck_count: number;
  deck_ids?: number[];
}

export function FlashcardsPage() {
    const navigate  = useNavigate();

    // UI state from list store
    const viewMode      = useDeckListStore((s) => s.viewMode);
    const setViewMode   = useDeckListStore((s) => s.setViewMode);
    const searchQuery   = useDeckListStore((s) => s.searchQuery);
    const setSearchQuery = useDeckListStore((s) => s.setSearchQuery);

    // Local UI state
    const [showCreator, setShowCreator]       = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importDeckId, setImportDeckId]     = useState<number | null>(null);
    const [activeFilter, setActiveFilter]     = useState('All');

    // Phase C: Collection filter
    const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);

    // Data hooks
    const { data: decksData, isLoading, isError, error } = useDecks();
    const { mutate: deleteDeck } = useDeleteDeck();

    // Collections (for deck_ids filtering)
    const { data: collections = [] } = useQuery<Collection[]>({
        queryKey: ['collections'],
        queryFn:  () => CollectionsService.listCollectionsApiV1CollectionsGet() as Promise<Collection[]>,
        staleTime: 60_000,
    });

    // Ensure decks is an array
    const decks: Deck[] = Array.isArray(decksData) ? (decksData as unknown as Deck[]) : [];

    // Build collection → deck_id set for O(1) lookup
    const collectionDeckIds = useMemo(() => {
        if (!activeCollectionId) return null;
        const col = collections.find((c) => c.id === activeCollectionId);
        if (!col) return null;
        // Prefer deck_ids array if server returns it; fallback to collection_id on deck
        if (col.deck_ids && col.deck_ids.length > 0) return new Set(col.deck_ids);
        return null; // Will fall back to deck.collection_id
    }, [activeCollectionId, collections]);

    // Filter decks by tag, search, AND active collection
    const filteredDecks = useMemo(
        () =>
            decks.filter((deck) => {
                const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesTag    =
                    activeFilter === 'All' ||
                    (deck.tags ?? []).includes(activeFilter);

                let matchesCollection = true;
                if (activeCollectionId !== null) {
                    if (collectionDeckIds) {
                        matchesCollection = collectionDeckIds.has(deck.id);
                    } else {
                        // Fallback: use collection_id field on deck if exists
                        matchesCollection = (deck as any).collection_id === activeCollectionId;
                    }
                }

                return matchesSearch && matchesTag && matchesCollection;
            }),
        [decks, searchQuery, activeFilter, activeCollectionId, collectionDeckIds],
    );

    // Handlers
    const handleDeckClick   = (deckId: number) => navigate(`/flashcards/${deckId}`);
    const handleDeckEdit    = (deckId: number) => navigate(`/flashcards/${deckId}/edit`);
    const handleDeckReview  = (deckId: number) => navigate(`/flashcards/${deckId}/review`);
    const handleDeckDelete  = (deckId: number) => {
        if (confirm('Delete this deck? This action cannot be undone.')) {
            deleteDeck(deckId);
        }
    };
    const handleCreatorSuccess = (deckId: number) => {
        setShowCreator(false);
        navigate(`/flashcards/${deckId}`);
    };

    return (
        <>
            <FlashcardsHub
                decks={filteredDecks}
                isLoading={isLoading}
                isError={isError}
                error={error}
                viewMode={viewMode}
                onViewChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                activeCollectionId={activeCollectionId}
                onCollectionChange={setActiveCollectionId}
                onCreate={() => setShowCreator(true)}
                onAiGenerate={() => navigate('/flashcards/ai-design')}
                onImport={() => {
                    setImportDeckId(null);
                    setShowImportModal(true);
                }}
                onDeckClick={handleDeckClick}
                onDeckDelete={handleDeckDelete}
                onDeckEdit={handleDeckEdit}
                onDeckReview={handleDeckReview}
            />

            {/* AI Generator Modal */}
            <AnimatePresence>
                {showCreator && (
                    <DeckCreator
                        onClose={() => setShowCreator(false)}
                        onSuccess={handleCreatorSuccess}
                    />
                )}
            </AnimatePresence>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <ImportModal
                        isOpen={showImportModal}
                        onClose={() => {
                            setShowImportModal(false);
                            setImportDeckId(null);
                        }}
                        deckId={importDeckId}
                        onImportSuccess={() => {
                            setShowImportModal(false);
                            setImportDeckId(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
