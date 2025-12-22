import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, X, Sparkles, TrendingUp } from "lucide-react";
import { searchNotesApiV1NotesSearchGet, NotesService } from "@/api/generated";
import { QUERY_KEYS } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { NoteSearchResult } from "@/api/generated";

/**
 * Enhanced Note Search Component
 *
 * Features:
 * - Fuzzy search with debouncing (300ms)
 * - Highlighted matching text (yellow background)
 * - Context snippets around matches
 * - Match type badges (title, content, tags)
 * - Relevance score display
 * - Stagger animation on results
 * - Empty states
 * - Loading skeletons
 */

interface NoteSearchProps {
  onSelectNote?: (noteId: number) => void;
}

export function NoteSearch({ onSelectNote }: NoteSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // Search query
  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [QUERY_KEYS.NOTES.SEARCH(debouncedQuery)],
    queryFn: () =>
      searchNotesApiV1NotesSearchGet({
        query: debouncedQuery,
        limit: 20,
      }),
    enabled: debouncedQuery.length > 0,
  });

  const clearSearch = () => {
    setQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes by title, content, or tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-1"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {(isLoading || isFetching) && debouncedQuery && (
        <div className="space-y-2">
          <SkeletonCard count={3} variant="compact" />
        </div>
      )}

      {/* Results */}
      {!isLoading && !isFetching && debouncedQuery && (
        <>
          {results.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Found {results.length} result{results.length === 1 ? "" : "s"}
                </span>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-powered search
                </Badge>
              </div>
              {results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  query={debouncedQuery}
                  onClick={() => onSelectNote?.(result.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No results found"
              description={`No notes match "${debouncedQuery}". Try different keywords.`}
              action={{
                label: "Clear Search",
                onClick: clearSearch,
              }}
              variant="no-results"
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!query && (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Search your notes"
          description="Start typing to search by title, content, or tags"
          variant="default"
        />
      )}
    </div>
  );
}

/**
 * Search Result Card Component
 * Individual search result with highlighting
 */
interface SearchResultCardProps {
  result: NoteSearchResult;
  query: string;
  onClick?: () => void;
}

function SearchResultCard({ result, query, onClick }: SearchResultCardProps) {
  // Highlight matching text with mark tag
  const highlightText = (text: string, query: string): string => {
    if (!query) return text;

    const words = query.toLowerCase().split(/\s+/);
    let highlighted = text;

    words.forEach((word) => {
      const regex = new RegExp(`(${word})`, "gi");
      highlighted = highlighted.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">$1</mark>',
      );
    });

    return highlighted;
  };

  // Get context snippet around match
  const getContextSnippet = (
    content: string,
    query: string,
    maxLength = 150,
  ): string => {
    const lowerContent = content.toLowerCase();
    const words = query.toLowerCase().split(/\s+/);

    // Find first match
    let index = -1;
    for (const word of words) {
      index = lowerContent.indexOf(word);
      if (index !== -1) break;
    }

    if (index === -1) {
      return (
        content.substring(0, maxLength) +
        (content.length > maxLength ? "..." : "")
      );
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + 100);
    const snippet = content.substring(start, end);

    return (
      (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "")
    );
  };

  // Get match type color
  const getMatchTypeColor = (matchType: string): string => {
    switch (matchType) {
      case "title":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300";
      case "content":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300";
      case "tags":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get relevance color
  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return "text-green-600 dark:text-green-500";
    if (score >= 0.5) return "text-amber-600 dark:text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3 },
        },
      }}
    >
      <Card
        className={cn(
          "hover:shadow-md transition-all duration-300 cursor-pointer",
          "hover:border-primary/50 hover:scale-[1.01]",
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3
              className="font-medium line-clamp-1 flex-1"
              dangerouslySetInnerHTML={{
                __html: highlightText(result.title, query),
              }}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={cn("text-xs", getMatchTypeColor(result.match_type))}
              >
                {result.match_type}
              </Badge>
            </div>
          </div>

          <p
            className="text-sm text-muted-foreground line-clamp-2 mb-3"
            dangerouslySetInnerHTML={{
              __html: highlightText(
                getContextSnippet(result.content, query),
                query,
              ),
            }}
          />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {result.format}
              </Badge>
              {result.score > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp
                    className={cn("h-3 w-3", getRelevanceColor(result.score))}
                  />
                  <span
                    className={cn(
                      "font-medium",
                      getRelevanceColor(result.score),
                    )}
                  >
                    {(result.score * 100).toFixed(0)}% match
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
