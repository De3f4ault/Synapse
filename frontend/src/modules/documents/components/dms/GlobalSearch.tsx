/**
 * GlobalSearch — Command palette for searching everything
 *
 * Modeled after Paperless-ngx global-search.component.ts.
 * Uses cmdk for the command palette UI with grouped results.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useGlobalSearch, type SearchResult } from "../../hooks/useGlobalSearch";
import {
  FileText,
  User,
  Tag,
  FolderOpen,
  Bookmark,
  Search,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// ============================================================================
// Props
// ============================================================================

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDocument?: (id: number) => void;
  onSelectCorrespondent?: (id: number) => void;
  onSelectDocumentType?: (id: number) => void;
  onSelectTag?: (id: number) => void;
  onSelectSavedView?: (id: number) => void;
}

const TYPE_ICONS: Record<SearchResult["type"], typeof FileText> = {
  document: FileText,
  correspondent: User,
  documentType: FolderOpen,
  tag: Tag,
  savedView: Bookmark,
  storagePath: FolderOpen,
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  document: "Documents",
  correspondent: "Correspondents",
  documentType: "Document Types",
  tag: "Tags",
  savedView: "Saved Views",
  storagePath: "Storage Paths",
};

const TYPE_BADGE_CLASSES: Record<SearchResult["type"], string> = {
  document: "bg-primary/10 text-primary/80",
  correspondent: "bg-info/10 text-blue-300",
  documentType: "bg-accent-olive/10 text-accent-olive/80",
  tag: "bg-accent/10 text-accent/80",
  savedView: "bg-warning/10 text-amber-300",
  storagePath: "bg-slate-500/10 text-foreground/80",
};

// ============================================================================
// Component
// ============================================================================

export function GlobalSearch({
  open,
  onOpenChange,
  onSelectDocument,
  onSelectCorrespondent,
  onSelectDocumentType,
  onSelectTag,
  onSelectSavedView,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: results, isLoading } = useGlobalSearch(query);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Flatten results for keyboard navigation
  const allResults: SearchResult[] = results
    ? [
        ...results.documents,
        ...results.correspondents,
        ...results.documentTypes,
        ...results.tags,
        ...results.savedViews,
      ]
    : [];

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    switch (result.type) {
      case "document":
        onSelectDocument?.(result.id);
        break;
      case "correspondent":
        onSelectCorrespondent?.(result.id);
        break;
      case "documentType":
        onSelectDocumentType?.(result.id);
        break;
      case "tag":
        onSelectTag?.(result.id);
        break;
      case "savedView":
        onSelectSavedView?.(result.id);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[activeIndex]) {
      e.preventDefault();
      handleSelect(allResults[activeIndex]);
    }
  };

  const hasResults = allResults.length > 0;
  const showEmpty = query.length >= 2 && !isLoading && !hasResults;

  // Group results by type for rendering
  const groups = results
    ? (Object.entries(results) as [keyof typeof results, SearchResult[]][]).filter(
        ([, items]) => items.length > 0
      )
    : [];

  // Track cumulative index for active highlight
  let cumulativeIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-card/95 backdrop-blur-2xl border-border shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, correspondents, tags…"
            className="flex-1 bg-transparent text-foreground/70 text-sm placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          {isLoading && <Loader2 size={16} className="text-primary animate-spin" />}
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded border border-border bg-foreground/5 text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {groups.map(([groupKey, items]) => {
            const groupType = items[0]?.type;
            if (!groupType) return null;
            const startIdx = cumulativeIndex;
            cumulativeIndex += items.length;

            return (
              <div key={groupKey}>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  {TYPE_LABELS[groupType]}
                </div>
                {items.map((result, i) => {
                  const globalIdx = startIdx + i;
                  const isActive = globalIdx === activeIndex;
                  const Icon = TYPE_ICONS[result.type];

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground/80 hover:bg-muted/30"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {result.name}
                        </span>
                        {result.detail && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {result.detail}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          TYPE_BADGE_CLASSES[result.type]
                        )}
                      >
                        {TYPE_LABELS[result.type].replace(/s$/, "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Empty state */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search size={32} strokeWidth={1} className="mb-3 text-muted-foreground" />
              <p className="text-sm">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Hint when empty query */}
          {query.length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Type to search across everything</p>
              <div className="flex gap-2 mt-3">
                {["Documents", "Tags", "Correspondents"].map((tip) => (
                  <span
                    key={tip}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground"
                  >
                    {tip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-foreground/5 font-mono">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-foreground/5 font-mono">↵</kbd>{" "}
              select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-foreground/5 font-mono">esc</kbd>{" "}
              close
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
