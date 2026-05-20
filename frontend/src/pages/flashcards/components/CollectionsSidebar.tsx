/**
 * CollectionsSidebar
 *
 * Left sidebar for FlashcardsPage that:
 *  - Lists user collections (folders) with deck counts
 *  - Allows creating new collections (inline input)
 *  - Filters the deck grid when a collection is selected
 *  - Shows AI suggestion banner on uncategorised decks
 *  - Allows assigning decks to collections via drag or a modal
 *
 * API surface (CollectionsService):
 *  GET  /collections/            → list
 *  POST /collections/            → create
 *  PATCH /collections/{id}       → rename
 *  DELETE /collections/{id}      → delete (decks become uncategorised)
 *  POST /collections/assign      → assign deck to collection
 *  POST /collections/suggest     → AI suggestion for a deck
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderOpen,
  Folder,
  Plus,
  Check,
  X,
  MoreHorizontal,
  Sparkles,
  Layers,
  Trash2,
  Pencil,
} from 'lucide-react';
import { CollectionsService } from '@/api/generated';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Deck } from '../core';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface Collection {
  id: number;
  name: string;
  description?: string | null;
  deck_count: number;
  deck_ids?: number[];
}

interface AssignDeckRequest {
  deck_id: number;
  collection_id: number | null;
}

interface SuggestResult {
  action: 'existing' | 'create';
  collection_id?: number;
  suggested_name?: string;
  confidence: number;
}

// ─────────────────────────────────────────────────────────
// AI Suggestion Banner
// ─────────────────────────────────────────────────────────

function AISuggestionBanner({
  deck,
  collections,
  onAccept,
  onDismiss,
}: {
  deck: Deck;
  collections: Collection[];
  onAccept: (collectionId: number, newName?: string) => void;
  onDismiss: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResult | null>(null);

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const res = await CollectionsService.suggestCollectionApiV1CollectionsSuggestPost({
        deck_id: deck.id,
        deck_name: deck.name,
        deck_description: (deck as any).description ?? null,
      } as any);
      setSuggestion(res);
    } catch {
      toast.error('AI suggestion unavailable');
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  if (!suggestion && !loading) {
    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2">
        <Sparkles size={13} className="text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground">Uncategorised deck</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">"{deck.name}"</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchSuggestion}
            className="text-[10px] px-2 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Suggest
          </button>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-0.5">
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2">
        <Sparkles size={13} className="text-primary animate-pulse shrink-0" />
        <span className="text-[11px] text-muted-foreground">Thinking…</span>
      </div>
    );
  }

  if (suggestion) {
    const targetCollection = suggestion.action === 'existing' && suggestion.collection_id
      ? collections.find((c) => c.id === suggestion.collection_id)
      : null;
    const label = targetCollection?.name ?? suggestion.suggested_name ?? 'New collection';

    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/25 space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">AI Suggestion</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {Math.round(suggestion.confidence * 100)}% confident
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">
          Move to <span className="text-primary">"{label}"</span>?
          {suggestion.action === 'create' && (
            <span className="text-muted-foreground text-[10px] ml-1">(new)</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (suggestion.action === 'existing' && suggestion.collection_id) {
                onAccept(suggestion.collection_id);
              } else {
                // Will create a new collection then assign — caller handles this
                onAccept(-1, suggestion.suggested_name);
              }
            }}
            className="flex-1 text-[10px] py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onDismiss}
            className="text-[10px] py-1.5 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────
// Assign Deck Modal
// ─────────────────────────────────────────────────────────

function AssignModal({
  deck,
  collections,
  currentCollectionId,
  onAssign,
  onClose,
}: {
  deck: Deck;
  collections: Collection[];
  currentCollectionId?: number | null;
  onAssign: (collectionId: number | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl"
      >
        <h2 className="text-sm font-bold text-foreground mb-1">Move to Collection</h2>
        <p className="text-[11px] text-muted-foreground mb-4 line-clamp-1">"{deck.name}"</p>

        <div className="space-y-1.5">
          <button
            onClick={() => onAssign(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors',
              currentCollectionId == null
                ? 'bg-primary/10 border border-primary/30 text-primary'
                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers size={14} />
            Uncategorised
            {currentCollectionId == null && <Check size={12} className="ml-auto" />}
          </button>

          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => onAssign(col.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors',
                currentCollectionId === col.id
                  ? 'bg-primary/10 border border-primary/30 text-primary'
                  : 'hover:bg-muted/50 text-foreground',
              )}
            >
              <Folder size={14} />
              {col.name}
              <span className="text-[10px] text-muted-foreground ml-1">({col.deck_count})</span>
              {currentCollectionId === col.id && <Check size={12} className="ml-auto" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main CollectionsSidebar
// ─────────────────────────────────────────────────────────

interface CollectionsSidebarProps {
  /** Currently selected collection filter. null = all decks */
  selectedCollectionId: number | null;
  onSelectCollection: (id: number | null) => void;
  /** Deck to show AI suggestion banner for (first uncategorised deck) */
  suggestDeck?: Deck | null;
}

export function CollectionsSidebar({
  selectedCollectionId,
  onSelectCollection,
  suggestDeck,
}: CollectionsSidebarProps) {
  const qc = useQueryClient();

  const [creating, setCreating]             = useState(false);
  const [newName, setNewName]               = useState('');
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [editName, setEditName]             = useState('');
  const [menuOpenId, setMenuOpenId]         = useState<number | null>(null);
  const [dismissedSuggest, setDismissed]    = useState(false);
  const [assignDeck, setAssignDeck]         = useState<{ deck: Deck; collectionId: number | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn:  () => CollectionsService.listCollectionsApiV1CollectionsGet() as Promise<Collection[]>,
    staleTime: 60_000,
  });

  // ── Mutations ────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['collections'] });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      CollectionsService.createCollectionApiV1CollectionsPost({ name }),
    onSuccess: () => { toast.success('Collection created'); invalidate(); setCreating(false); setNewName(''); },
    onError:   () => toast.error('Failed to create collection'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      CollectionsService.updateCollectionApiV1CollectionsCollectionIdPatch(id, { name }),
    onSuccess: () => { toast.success('Renamed'); invalidate(); setEditingId(null); },
    onError:   () => toast.error('Failed to rename'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      CollectionsService.deleteCollectionApiV1CollectionsCollectionIdDelete(id),
    onSuccess: () => {
      toast.success('Collection deleted · decks moved to Uncategorised');
      if (selectedCollectionId === menuOpenId) onSelectCollection(null);
      invalidate();
    },
    onError: () => toast.error('Failed to delete'),
  });

  const assignMutation = useMutation({
    mutationFn: (req: AssignDeckRequest) =>
      CollectionsService.assignDeckToCollectionApiV1CollectionsAssignPost(req as any),
    onSuccess: () => { toast.success('Deck moved'); invalidate(); setAssignDeck(null); },
    onError:   () => toast.error('Failed to move deck'),
  });

  // ── Handlers ─────────────────────────────────────────────

  const submitCreate = () => {
    const name = newName.trim();
    if (name) createMutation.mutate(name);
  };

  const handleAIAccept = async (collectionId: number, newColName?: string) => {
    if (!suggestDeck) return;

    let targetId = collectionId;
    if (collectionId === -1 && newColName) {
      // Create the suggested collection first
      const created: any = await CollectionsService.createCollectionApiV1CollectionsPost({
        name: newColName,
      });
      targetId = created.id;
      invalidate();
    }

    assignMutation.mutate({ deck_id: suggestDeck.id, collection_id: targetId });
    setDismissed(true);
  };

  const totalDecks = collections.reduce((sum, c) => sum + c.deck_count, 0);

  return (
    <>
      <div className="w-56 flex-shrink-0 border-r border-border bg-background/50 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Collections
            </h3>
            <button
              onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="New collection"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* New collection input */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCreate();
                      if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                    }}
                    placeholder="Collection name…"
                    className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={submitCreate}
                    disabled={!newName.trim()}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName(''); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collection List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">

          {/* All Decks */}
          <button
            onClick={() => onSelectCollection(null)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left',
              selectedCollectionId === null
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Layers size={14} className="shrink-0" />
            <span className="flex-1 font-medium">All Decks</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{totalDecks}</span>
          </button>

          {/* Collections */}
          {collections.map((col) => (
            <div key={col.id} className="relative group">
              {editingId === col.id ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameMutation.mutate({ id: col.id, name: editName });
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-2 py-1 outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => renameMutation.mutate({ id: col.id, name: editName })}
                    className="p-1 rounded bg-primary text-primary-foreground"
                  >
                    <Check size={10} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpenId(null);
                    onSelectCollection(selectedCollectionId === col.id ? null : col.id);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left',
                    selectedCollectionId === col.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {selectedCollectionId === col.id
                    ? <FolderOpen size={14} className="shrink-0" />
                    : <Folder size={14} className="shrink-0" />
                  }
                  <span className="flex-1 font-medium truncate">{col.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{col.deck_count}</span>
                </button>
              )}

              {/* Context menu trigger */}
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === col.id ? null : col.id); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <MoreHorizontal size={12} />
              </button>

              {/* Context menu */}
              <AnimatePresence>
                {menuOpenId === col.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute left-2 right-2 top-full mt-1 z-40 bg-popover border border-border rounded-xl shadow-xl py-1"
                    >
                      <button
                        onClick={() => { setEditingId(col.id); setEditName(col.name); setMenuOpenId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-foreground"
                      >
                        <Pencil size={11} />
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${col.name}"? Decks won't be deleted.`)) {
                            deleteMutation.mutate(col.id);
                          }
                          setMenuOpenId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* AI Suggestion Banner */}
        {suggestDeck && !dismissedSuggest && (
          <div className="shrink-0 border-t border-border pt-3">
            <AISuggestionBanner
              deck={suggestDeck}
              collections={collections}
              onAccept={handleAIAccept}
              onDismiss={() => setDismissed(true)}
            />
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignDeck && (
          <AssignModal
            deck={assignDeck.deck}
            collections={collections}
            currentCollectionId={assignDeck.collectionId}
            onAssign={(collectionId) =>
              assignMutation.mutate({ deck_id: assignDeck.deck.id, collection_id: collectionId })
            }
            onClose={() => setAssignDeck(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Public hook for parent to wire the assign modal ─────

export function useCollectionAssign() {
  const [assignState, setAssignState] = useState<{ deck: Deck; collectionId: number | null } | null>(null);
  return {
    openAssign: (deck: Deck, collectionId: number | null) => setAssignState({ deck, collectionId }),
    assignState,
    closeAssign: () => setAssignState(null),
  };
}
