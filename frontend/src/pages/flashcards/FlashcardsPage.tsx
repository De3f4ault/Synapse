/**
 * FlashcardsPage - Pure Orchestration
 * 
 * Refactored to use FlashcardsHub layout.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Module public APIs
import { useDecks, useDeleteDeck, useDeckListStore } from './list';
import { DeckCreator } from './create';
import { ImportModal } from './components/ImportModal';
import { FlashcardsHub } from './components/FlashcardsHub';
import type { Deck } from './core';

export function FlashcardsPage() {
    const navigate = useNavigate();

    // UI state from list store
    const viewMode = useDeckListStore((s) => s.viewMode);
    const setViewMode = useDeckListStore((s) => s.setViewMode);
    const searchQuery = useDeckListStore((s) => s.searchQuery);
    const setSearchQuery = useDeckListStore((s) => s.setSearchQuery);

    // Local UI state
    const [showCreator, setShowCreator] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importDeckId, setImportDeckId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState("All");

    // Data hooks
    const { data: decksData, isLoading, isError, error } = useDecks();
    const { mutate: deleteDeck } = useDeleteDeck();

    // Ensure decks is an array
    const decks: Deck[] = Array.isArray(decksData) ? decksData : [];

    // Filter decks by search AND filter (filter currently just dummy "All")
    const filteredDecks = useMemo(
        () =>
            decks.filter((deck) =>
                deck.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [decks, searchQuery]
    );

    // Handlers
    const handleDeckClick = (deckId: number) => navigate(`/flashcards/${deckId}`);
    const handleDeckEdit = (deckId: number) => navigate(`/flashcards/${deckId}/edit`);
    const handleDeckReview = (deckId: number) => navigate(`/flashcards/${deckId}/review`);
    const handleDeckDelete = (deckId: number) => {
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
                onCreate={() => setShowCreator(true)}
                onAiGenerate={() => setShowCreator(true)} // Reuse creator for now
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
