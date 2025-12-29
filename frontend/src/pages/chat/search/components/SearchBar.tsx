/**
 * SearchBar - IDE-style search controls with navigation and jump-to
 * 
 * Features:
 * - Query input with debounce
 * - Case-sensitive / Whole-word toggles
 * - Occurrence counter (3/15)
 * - Jump-to-occurrence dropdown
 * - Prev/Next navigation buttons
 * - Recent searches on focus
 * - Keyboard shortcuts (Enter, Shift+Enter, Escape)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Search,
    ChevronUp,
    ChevronDown,
    X,
    CaseSensitive,
    WholeWord,
    Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchOptions, SearchState, SearchOccurrence } from '../types';
import { JumpToDropdown } from './JumpToDropdown';

interface SearchBarProps {
    state: SearchState;
    occurrences: SearchOccurrence[];
    onQueryChange: (query: string) => void;
    onOptionsChange: (options: Partial<SearchOptions>) => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onJumpTo?: (index: number) => void;
    recentSearches?: string[];
    onRecentSearchClick?: (query: string) => void;
    className?: string;
}

export function SearchBar({
    state,
    occurrences,
    onQueryChange,
    onOptionsChange,
    onNext,
    onPrev,
    onClose,
    onJumpTo,
    recentSearches = [],
    onRecentSearchClick,
    className,
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localQuery, setLocalQuery] = useState(state.query);
    const [showRecent, setShowRecent] = useState(false);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Sync local query with state
    useEffect(() => {
        setLocalQuery(state.query);
    }, [state.query]);

    // Debounced query update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localQuery !== state.query) {
                onQueryChange(localQuery);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [localQuery, state.query, onQueryChange]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onPrev();
            } else {
                onNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [onNext, onPrev, onClose]);

    const handleFocus = useCallback(() => {
        if (localQuery.length === 0 && recentSearches.length > 0) {
            setShowRecent(true);
        }
    }, [localQuery, recentSearches]);

    const handleBlur = useCallback(() => {
        // Delay to allow click on recent item
        setTimeout(() => setShowRecent(false), 150);
    }, []);

    const hasResults = state.totalCount > 0;
    const noResults = state.query.length >= 2 && state.totalCount === 0;
    const showRecentDropdown = showRecent && recentSearches.length > 0;

    return (
        <div className="relative">
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur border-b border-border",
                    className
                )}
            >
                {/* Search Icon */}
                <Search className="size-4 text-muted-foreground shrink-0" />

                {/* Query Input */}
                <div className="relative flex-1">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Find in conversation..."
                        className={cn(
                            "h-8 text-sm bg-transparent border-none focus-visible:ring-0 px-0",
                            noResults && "text-destructive"
                        )}
                    />
                </div>

                {/* Options Toggles */}
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant={state.options.caseSensitive ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onOptionsChange({ caseSensitive: !state.options.caseSensitive })}
                        aria-label="Case sensitive"
                        title="Match case (Aa)"
                    >
                        <CaseSensitive className="size-4" />
                    </Button>

                    <Button
                        variant={state.options.wholeWord ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onOptionsChange({ wholeWord: !state.options.wholeWord })}
                        aria-label="Whole word"
                        title="Match whole word"
                    >
                        <WholeWord className="size-4" />
                    </Button>
                </div>

                {/* Occurrence Counter */}
                {state.query.length >= 2 && (
                    <span className={cn(
                        "text-xs tabular-nums shrink-0 min-w-[4rem] text-center",
                        hasResults ? "text-muted-foreground" : "text-destructive"
                    )}>
                        {hasResults
                            ? `${state.currentIndex + 1} of ${state.totalCount}`
                            : "No results"
                        }
                    </span>
                )}

                {/* Jump-To Dropdown (when multiple occurrences) */}
                {hasResults && onJumpTo && (
                    <JumpToDropdown
                        occurrences={occurrences}
                        currentIndex={state.currentIndex}
                        onJump={onJumpTo}
                    />
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onPrev}
                        disabled={!hasResults}
                        aria-label="Previous occurrence (Shift+Enter)"
                        title="Previous (Shift+Enter)"
                    >
                        <ChevronUp className="size-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onNext}
                        disabled={!hasResults}
                        aria-label="Next occurrence (Enter)"
                        title="Next (Enter)"
                    >
                        <ChevronDown className="size-4" />
                    </Button>
                </div>

                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={onClose}
                    aria-label="Close search (Escape)"
                    title="Close (Esc)"
                >
                    <X className="size-4" />
                </Button>
            </div>

            {/* Recent Searches Dropdown */}
            {showRecentDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-white/10 rounded-b-lg shadow-xl py-1">
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Clock className="size-3" />
                        Recent searches
                    </div>
                    {recentSearches.map((query) => (
                        <button
                            key={query}
                            onClick={() => {
                                onRecentSearchClick?.(query);
                                setLocalQuery(query);
                                setShowRecent(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors"
                        >
                            {query}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchBar;
