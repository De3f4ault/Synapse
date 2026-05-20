import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Filter,
  Layers,
  Plus,
  Sparkles,
  Folder,
  FolderOpen,
  Check,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarShell } from "@/shared/ui";
import { CollectionsService } from "@/api/generated";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────

interface Collection {
  id: number;
  name: string;
  deck_count: number;
}

interface FlashcardsSidebarProps {
  className?: string;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  /** null = all, number = filter by collection */
  activeCollectionId: number | null;
  onCollectionChange: (id: number | null) => void;
  totalDecks: number;
  tags: string[];
  onCreate?: () => void;
  onAiGenerate?: () => void;
}

// ─── Collections Section ──────────────────────────────────

function CollectionsSection({
  isCollapsed,
  activeCollectionId,
  onCollectionChange,
}: {
  isCollapsed: boolean;
  activeCollectionId: number | null;
  onCollectionChange: (id: number | null) => void;
}) {
  const qc = useQueryClient();
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editName, setEditName]     = useState("");
  const [menuId, setMenuId]         = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn:  () => CollectionsService.listCollectionsApiV1CollectionsGet() as Promise<Collection[]>,
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["collections"] });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      CollectionsService.createCollectionApiV1CollectionsPost({ name }),
    onSuccess: () => {
      toast.success("Collection created");
      invalidate();
      setCreating(false);
      setNewName("");
    },
    onError: () => toast.error("Failed to create collection"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      CollectionsService.updateCollectionApiV1CollectionsCollectionIdPatch(id, { name }),
    onSuccess: () => { toast.success("Renamed"); invalidate(); setEditingId(null); },
    onError: () => toast.error("Failed to rename"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      CollectionsService.deleteCollectionApiV1CollectionsCollectionIdDelete(id),
    onSuccess: (_, id) => {
      toast.success("Deleted · decks moved to Uncategorised");
      if (activeCollectionId === id) onCollectionChange(null);
      invalidate();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const submit = () => {
    const name = newName.trim();
    if (name) createMutation.mutate(name);
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          title="All Decks"
          onClick={() => onCollectionChange(null)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            activeCollectionId === null
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Layers className="w-4 h-4" />
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            title={col.name}
            onClick={() => onCollectionChange(activeCollectionId === col.id ? null : col.id)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeCollectionId === col.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {activeCollectionId === col.id
              ? <FolderOpen className="w-4 h-4" />
              : <Folder className="w-4 h-4" />
            }
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-0.5">
      {/* Section header */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 mb-2">
        <Folder className="w-3 h-3" />
        <span>Collections</span>
        <button
          onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="ml-auto p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title="New collection"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Inline create */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-2 mb-1"
          >
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") { setCreating(false); setNewName(""); }
                }}
                placeholder="Name…"
                className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary/50"
              />
              <button
                onClick={submit}
                disabled={!newName.trim()}
                className="p-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All decks */}
      <div
        onClick={() => onCollectionChange(null)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
          activeCollectionId === null
            ? "bg-muted border border-border text-foreground"
            : "text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent",
        )}
      >
        <Layers className={cn("w-4 h-4 shrink-0", activeCollectionId === null ? "text-primary" : "text-muted-foreground")} />
        <span className="flex-1 truncate">All Decks</span>
      </div>

      {/* Per-collection rows */}
      {collections.map((col) => (
        <div key={col.id} className="relative group/col">
          {editingId === col.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameMutation.mutate({ id: col.id, name: editName });
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-2 py-1 outline-none focus:border-primary/50"
              />
              <button onClick={() => renameMutation.mutate({ id: col.id, name: editName })} className="p-1 rounded bg-primary text-primary-foreground">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => { setMenuId(null); onCollectionChange(activeCollectionId === col.id ? null : col.id); }}
              className={cn(
                "group/row flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                activeCollectionId === col.id
                  ? "bg-muted border border-border text-foreground"
                  : "text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent",
              )}
            >
              {activeCollectionId === col.id
                ? <FolderOpen className="w-4 h-4 shrink-0 text-primary" />
                : <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
              }
              <span className="flex-1 truncate">{col.name}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{col.deck_count}</span>
            </div>
          )}

          {/* Ellipsis menu */}
          <button
            onClick={(e) => { e.stopPropagation(); setMenuId(menuId === col.id ? null : col.id); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/col:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {menuId === col.id && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute left-2 right-2 top-full mt-0.5 z-40 bg-popover border border-border rounded-xl shadow-xl py-1"
                >
                  <button
                    onClick={() => { setEditingId(col.id); setEditName(col.name); setMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${col.name}"?\nDecks won't be deleted.`)) {
                        deleteMutation.mutate(col.id);
                      }
                      setMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────

export const FlashcardsSidebar = ({
  className,
  activeFilter,
  onFilterChange,
  activeCollectionId,
  onCollectionChange,
  totalDecks,
  tags,
  onCreate,
  onAiGenerate,
}: FlashcardsSidebarProps) => {
  const displayTags = ["All", ...tags];

  return (
    <SidebarShell
      storageKey="flashcardsSidebarCollapsed"
      title="Flashcards"
      titleIcon={Layers}
      primaryAction={{
        label: "Create Deck",
        icon: Plus,
        onClick: () => onCreate?.(),
      }}
      secondaryAction={
        onAiGenerate
          ? { label: "AI Generate", icon: Sparkles, onClick: onAiGenerate }
          : undefined
      }
      statsLine={
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {totalDecks} Decks
        </span>
      }
      footerHint="Mastery requires consistency."
      className={className}
    >
      {(isCollapsed) => (
        <>
          {/* Tag Filters */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 mb-2">
                <Filter className="w-3 h-3" />
                <span>Filter by Tag</span>
              </div>
            )}

            {displayTags.map((tag) => {
              const isActive = activeFilter === tag;
              return (
                <div
                  key={tag}
                  onClick={() => onFilterChange(tag)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                    isActive
                      ? "bg-muted border border-border text-foreground"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent",
                  )}
                >
                  <Layers className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  {!isCollapsed && <span className="truncate">{tag}</span>}
                </div>
              );
            })}
          </div>

          {/* Collections Section */}
          <CollectionsSection
            isCollapsed={isCollapsed}
            activeCollectionId={activeCollectionId}
            onCollectionChange={onCollectionChange}
          />
        </>
      )}
    </SidebarShell>
  );
};
