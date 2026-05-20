/**
 * SearchResultsPanel - Session-Grouped Search Results with Recovery
 * 
 * Features:
 * - Frontend aggregation by session_id (no duplication)
 * - Deterministic match priority ranking
 * - Context breakdown (user/assistant/code/title)
 * - Zero-result recovery with suggestions
 * - Search mode indicator
 */

import { useMemo, useCallback } from 'react';
import {
    CheckCircle2,
    Search,
    Type,
    Sparkles,
    MessageSquare,
    Hash,
    Globe,
    FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversationSearchResult } from '@/api/generated';
import { NoResultsRecovery } from './NoResultsRecovery';

// ============================================================================
// Types
// ============================================================================

interface ContextBreakdown {
    userMessages: number;
    assistantMessages: number;
    codeBlocks: number;
    titleMatches: number;
}

interface GroupedSessionResult {
    sessionId: number;
    sessionTitle: string;
    occurrenceCount: number;
    messageIds: (number | null | undefined)[];
    bestMatchType: string;
    allMatchTypes: string[];
    matchContexts: string[];
    contextBreakdown: ContextBreakdown;
    preview: string;
    bestScore: number;
    latestMatch: string;
}

interface RecentSession {
    id: number;
    title: string;
}

interface SearchResultsPanelProps {
    results: ConversationSearchResult[];
    query: string;
    isLoading: boolean;
    onResultClick: (session: GroupedSessionResult, query: string) => void;
    onQueryChange?: (query: string) => void;
    recentSessions?: RecentSession[];
    searchMode?: 'conversation' | 'global';
    className?: string;
}

// ============================================================================
// Constants - Match Priority (Sensei-approved)
// ============================================================================

const MATCH_PRIORITY: Record<string, number> = {
    exact: 5,
    prefix: 4,
    bm25: 3,
    substring: 2,
    fuzzy: 1,
};

const MATCH_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    exact: { icon: CheckCircle2, color: 'text-accent-olive bg-accent-olive/20', label: 'Exact match' },
    prefix: { icon: CheckCircle2, color: 'text-accent-olive bg-accent-olive/20', label: 'Starts with' },
    bm25: { icon: Search, color: 'text-info bg-blue-500/20', label: 'Full-word' },
    substring: { icon: Type, color: 'text-orange-400 bg-orange-500/20', label: 'Contains' },
    fuzzy: { icon: Sparkles, color: 'text-accent bg-accent/20', label: 'Similar' },
};

// ============================================================================
// Utilities
// ============================================================================

function getBestMatchType(types: string[]): string {
    return types.reduce((best, current) => {
        const currentPriority = MATCH_PRIORITY[current] ?? 0;
        const bestPriority = MATCH_PRIORITY[best] ?? 0;
        return currentPriority > bestPriority ? current : best;
    }, 'fuzzy');
}

function formatTimeAgo(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatContextBreakdown(ctx: ContextBreakdown): string {
    const parts: string[] = [];
    if (ctx.titleMatches > 0) parts.push(`${ctx.titleMatches} title`);
    if (ctx.assistantMessages > 0) parts.push(`${ctx.assistantMessages} AI`);
    if (ctx.userMessages > 0) parts.push(`${ctx.userMessages} you`);
    if (ctx.codeBlocks > 0) parts.push(`${ctx.codeBlocks} code`);
    return parts.length > 0 ? parts.join(' · ') : '';
}

// ============================================================================
// Components
// ============================================================================

function SearchModeIndicator({ mode }: { mode: 'conversation' | 'global' }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
            {mode === 'conversation' ? (
                <>
                    <FileSearch className="size-3" />
                    <span>Searching this conversation</span>
                </>
            ) : (
                <>
                    <Globe className="size-3" />
                    <span>Searching all sessions</span>
                </>
            )}
        </div>
    );
}

function SessionResultItem({
    session,
    onClick,
}: {
    session: GroupedSessionResult;
    onClick: () => void;
}) {
    const config = MATCH_TYPE_CONFIG[session.bestMatchType] ?? MATCH_TYPE_CONFIG['fuzzy']!;
    const contextLabel = formatContextBreakdown(session.contextBreakdown);

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-muted/50 focus:bg-foreground/5 focus:outline-none",
                "group border border-transparent hover:border-border"
            )}
        >
            {/* Header: Title + Occurrence Count */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate flex-1">
                    {session.sessionTitle}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Occurrence count badge */}
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        <Hash className="size-2.5" />
                        {session.occurrenceCount}
                    </span>
                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground">
                        {formatTimeAgo(session.latestMatch)}
                    </span>
                </div>
            </div>

            {/* Context breakdown summary line */}
            {contextLabel && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <span>Matches in:</span>
                    <span className="text-foreground/70">{contextLabel}</span>
                </div>
            )}

            {/* Preview snippet */}
            {session.preview && (
                <div className="flex items-start gap-2 mb-1.5">
                    <MessageSquare className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {session.preview}
                    </p>
                </div>
            )}

            {/* Meta: Match type badge with tooltip label */}
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        config.color
                    )}
                    title={config.label}
                >
                    {session.bestMatchType}
                </span>
                {session.allMatchTypes.length > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                        +{session.allMatchTypes.length - 1} more types
                    </span>
                )}
            </div>
        </button>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchResultsPanel({
    results,
    query,
    isLoading,
    onResultClick,
    onQueryChange,
    recentSessions = [],
    searchMode = 'global',
    className,
}: SearchResultsPanelProps) {

    // ========================================================================
    // Frontend Aggregation by Session with Context Breakdown
    // ========================================================================

    const groupedBySession = useMemo((): GroupedSessionResult[] => {
        const groups = new Map<number, GroupedSessionResult>();

        for (const result of results) {
            const existing = groups.get(result.session_id);
            const context = result.match_context || 'title';

            if (existing) {
                // Aggregate into existing group
                existing.occurrenceCount++;
                existing.messageIds.push(result.message_id);
                if (!existing.allMatchTypes.includes(result.match_type || 'exact')) {
                    existing.allMatchTypes.push(result.match_type || 'exact');
                }
                if (!existing.matchContexts.includes(context)) {
                    existing.matchContexts.push(context);
                }
                // Update context breakdown
                if (context === 'title') existing.contextBreakdown.titleMatches++;
                else if (context === 'user_message') existing.contextBreakdown.userMessages++;
                else if (context === 'assistant_message') existing.contextBreakdown.assistantMessages++;
                // Note: code blocks would need to be detected from message content

                if (result.relevance_score > existing.bestScore) {
                    existing.bestScore = result.relevance_score;
                }
                if (new Date(result.created_at) > new Date(existing.latestMatch)) {
                    existing.latestMatch = result.created_at;
                }
            } else {
                // Create new group with context breakdown initialization
                const breakdown: ContextBreakdown = {
                    userMessages: context === 'user_message' ? 1 : 0,
                    assistantMessages: context === 'assistant_message' ? 1 : 0,
                    codeBlocks: 0,
                    titleMatches: context === 'title' ? 1 : 0,
                };

                groups.set(result.session_id, {
                    sessionId: result.session_id,
                    sessionTitle: result.session_title,
                    occurrenceCount: 1,
                    messageIds: [result.message_id],
                    bestMatchType: result.match_type || 'exact',
                    allMatchTypes: [result.match_type || 'exact'],
                    matchContexts: [context],
                    contextBreakdown: breakdown,
                    preview: result.message_snippet,
                    bestScore: result.relevance_score,
                    latestMatch: result.created_at,
                });
            }
        }

        // Compute deterministic best match type and sort by best score
        const grouped = Array.from(groups.values()).map(session => ({
            ...session,
            bestMatchType: getBestMatchType(session.allMatchTypes),
        }));

        return grouped.sort((a, b) => b.bestScore - a.bestScore);
    }, [results]);

    const handleClick = useCallback((session: GroupedSessionResult) => {
        onResultClick(session, query);
    }, [onResultClick, query]);

    const totalOccurrences = useMemo(() =>
        groupedBySession.reduce((sum, s) => sum + s.occurrenceCount, 0)
        , [groupedBySession]);

    const hasResults = groupedBySession.length > 0;
    const showNoResults = query.length >= 2 && !isLoading && !hasResults;

    return (
        <div className={cn("py-2", className)}>
            {/* Search Mode Indicator */}
            <SearchModeIndicator mode={searchMode} />

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>Searching...</span>
                </div>
            )}

            {/* Session-Grouped Results */}
            {hasResults && !isLoading && (
                <div>
                    <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                            {groupedBySession.length} {groupedBySession.length === 1 ? 'Session' : 'Sessions'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {totalOccurrences} total matches
                        </span>
                    </div>
                    <div className="space-y-1">
                        {groupedBySession.map((session) => (
                            <SessionResultItem
                                key={session.sessionId}
                                session={session}
                                onClick={() => handleClick(session)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Zero-Result Recovery */}
            {showNoResults && (
                <NoResultsRecovery
                    query={query}
                    recentSessions={recentSessions}
                    onSuggestionClick={onQueryChange}
                    onSessionClick={(session) => {
                        // Navigate to recent session directly
                        onResultClick({
                            sessionId: session.id,
                            sessionTitle: session.title,
                            occurrenceCount: 0,
                            messageIds: [],
                            bestMatchType: 'exact',
                            allMatchTypes: [],
                            matchContexts: [],
                            contextBreakdown: { userMessages: 0, assistantMessages: 0, codeBlocks: 0, titleMatches: 0 },
                            preview: '',
                            bestScore: 0,
                            latestMatch: new Date().toISOString(),
                        }, query);
                    }}
                />
            )}
        </div>
    );
}

export default SearchResultsPanel;
