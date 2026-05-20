/**
 * DeckPickerModal
 *
 * Shown on the AI Designer landing when no deck_id is in the URL.
 * The user either:
 *   (a) picks an existing deck from the list, or
 *   (b) types a new deck name and confirms.
 *
 * On confirm, the parent receives the resolved deck_id so it can
 * call POST /ai/design/session and open the designer.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Layers, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { FlashcardsService } from '@/api/generated/services/FlashcardsService';
import type { DeckResponse } from '@/api/generated/models/DeckResponse';
import { cn } from '@/lib/utils';

interface DeckPickerModalProps {
    onSelect: (deckId: number, deckName: string) => void;
}

export function DeckPickerModal({ onSelect }: DeckPickerModalProps) {
    const [decks, setDecks]         = useState<DeckResponse[]>([]);
    const [loading, setLoading]     = useState(true);
    const [query, setQuery]         = useState('');
    const [creating, setCreating]   = useState(false);
    const [newName, setNewName]     = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        FlashcardsService.listDecksApiV1DecksGet()
            .then(setDecks)
            .catch(() => setDecks([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (creating) inputRef.current?.focus();
    }, [creating]);

    const filtered = decks.filter((d) =>
        d.name.toLowerCase().includes(query.toLowerCase())
    );

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        setSubmitting(true);
        try {
            const deck = await FlashcardsService.createDeckApiV1DecksPost({
                name,
                description: 'Created by AI Card Designer',
                tags: [],
                is_public: false,
            });
            onSelect(deck.id, deck.name);
        } catch {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-border/40">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold">AI Card Designer</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Choose a deck to design cards for
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">

                    {/* Search existing */}
                    {!creating && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    placeholder="Search existing decks…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>

                            <div className="space-y-1">
                                {loading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        No decks found
                                    </p>
                                ) : (
                                    filtered.map((deck) => (
                                        <button
                                            key={deck.id}
                                            onClick={() => onSelect(deck.id, deck.name)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                                        >
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                <Layers className="h-3.5 w-3.5 text-primary/70" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{deck.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="pt-2 border-t border-border/30">
                                <button
                                    onClick={() => setCreating(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-primary"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Create new deck
                                </button>
                            </div>
                        </>
                    )}

                    {/* Create new deck form */}
                    <AnimatePresence>
                        {creating && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="space-y-3"
                            >
                                <p className="text-xs text-muted-foreground">
                                    Give your new deck a name — you can refine it with the AI designer.
                                </p>
                                <input
                                    ref={inputRef}
                                    placeholder="e.g. PostgreSQL Internals"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    className="w-full px-3 py-2 text-sm bg-muted/40 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCreating(false)}
                                        className="flex-1 py-2 text-sm rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || submitting}
                                        className={cn(
                                            'flex-1 py-2 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                                            newName.trim() && !submitting
                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                                        )}
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            'Create & Design'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
