/**
 * NoResultsRecovery - Provides recovery paths when search returns nothing
 * 
 * Shows:
 * 1. "No exact matches" message
 * 2. Suggestions for refining query
 * 3. Recent sessions as fallback
 */

import { Clock, Search, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentSession {
    id: number;
    title: string;
}

interface NoResultsRecoveryProps {
    query: string;
    recentSessions: RecentSession[];
    relaxationLevel?: 'none' | 'fuzzy' | 'recent';
    onSuggestionClick?: (suggestion: string) => void;
    onSessionClick?: (session: RecentSession) => void;
    className?: string;
}

// Generate search refinement suggestions
function getSuggestions(query: string): string[] {
    const words = query.trim().split(/\s+/);
    const suggestions: string[] = [];

    // Single word from multi-word query
    if (words.length > 1) {
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        if (firstWord) suggestions.push(firstWord);
        if (lastWord) suggestions.push(lastWord);
    }

    // Remove common suffixes (crude but effective)
    if (query.length > 4) {
        const shorter = query.slice(0, Math.ceil(query.length * 0.7));
        if (shorter.length >= 3) {
            suggestions.push(shorter);
        }
    }

    return [...new Set(suggestions)].slice(0, 3);
}

export function NoResultsRecovery({
    query,
    recentSessions,
    relaxationLevel = 'none',
    onSuggestionClick,
    onSessionClick,
    className,
}: NoResultsRecoveryProps) {
    const suggestions = getSuggestions(query);
    const hasRecent = recentSessions.length > 0;
    const hasSuggestions = suggestions.length > 0;

    return (
        <div className={cn("px-3 py-4 space-y-4", className)}>
            {/* Main message */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Search className="size-5 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">
                        No exact matches for "{query}"
                    </span>
                </div>

                {relaxationLevel === 'fuzzy' && (
                    <p className="text-xs text-amber-400/80">
                        Showing similar results instead
                    </p>
                )}
            </div>

            {/* Suggestions */}
            {hasSuggestions && onSuggestionClick && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lightbulb className="size-3" />
                        <span>Try searching for:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => onSuggestionClick(suggestion)}
                                className={cn(
                                    "px-2 py-1 text-xs rounded-full",
                                    "bg-primary/10 text-primary hover:bg-primary/20",
                                    "transition-colors"
                                )}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent sessions fallback */}
            {hasRecent && onSessionClick && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>Recent conversations:</span>
                    </div>
                    <div className="space-y-1">
                        {recentSessions.slice(0, 3).map((session) => (
                            <button
                                key={session.id}
                                onClick={() => onSessionClick(session)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
                                    "text-xs text-left text-muted-foreground",
                                    "hover:bg-white/5 hover:text-foreground",
                                    "transition-colors group"
                                )}
                            >
                                <span className="truncate flex-1">{session.title}</span>
                                <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Helpful tips */}
            <div className="text-center pt-2 border-t border-white/5">
                <p className="text-[10px] text-muted-foreground/70">
                    Try fewer words or check spelling
                </p>
            </div>
        </div>
    );
}

export default NoResultsRecovery;
