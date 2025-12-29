/**
 * HighlightedText - Renders text with search highlights
 * 
 * INVARIANT: Uses segmented rendering - never mutates source text
 * Highlights are inserted via array segments, not string manipulation
 */

import { useMemo } from 'react';
import { SearchOccurrence } from '../types';
import { cn } from '@/lib/utils';

interface TextSegment {
    text: string;
    isHighlight: boolean;
    isCurrent: boolean;
    occurrenceId?: string;
}

interface HighlightedTextProps {
    content: string;
    occurrences: SearchOccurrence[];
    currentOccurrenceId: string | null;
    blockStartOffset?: number;  // Absolute offset of this block in message
    className?: string;
}

/**
 * Convert text + occurrences into segments for rendering
 * This approach never mutates the source text
 */
function segmentText(
    content: string,
    occurrences: SearchOccurrence[],
    currentOccurrenceId: string | null
): TextSegment[] {
    if (occurrences.length === 0) {
        return [{ text: content, isHighlight: false, isCurrent: false }];
    }

    const segments: TextSegment[] = [];

    // Sort occurrences by startOffset
    const sortedOccs = [...occurrences].sort((a, b) => a.startOffset - b.startOffset);

    let lastEnd = 0;

    for (const occ of sortedOccs) {
        // Text before this occurrence
        if (occ.startOffset > lastEnd) {
            segments.push({
                text: content.slice(lastEnd, occ.startOffset),
                isHighlight: false,
                isCurrent: false,
            });
        }

        // The highlighted occurrence
        segments.push({
            text: content.slice(occ.startOffset, occ.endOffset),
            isHighlight: true,
            isCurrent: occ.id === currentOccurrenceId,
            occurrenceId: occ.id,
        });

        lastEnd = occ.endOffset;
    }

    // Remaining text after last occurrence
    if (lastEnd < content.length) {
        segments.push({
            text: content.slice(lastEnd),
            isHighlight: false,
            isCurrent: false,
        });
    }

    return segments;
}

export function HighlightedText({
    content,
    occurrences,
    currentOccurrenceId,
    className,
}: HighlightedTextProps) {
    const segments = useMemo(
        () => segmentText(content, occurrences, currentOccurrenceId),
        [content, occurrences, currentOccurrenceId]
    );

    return (
        <span className={className}>
            {segments.map((segment, idx) => {
                if (!segment.isHighlight) {
                    return <span key={idx}>{segment.text}</span>;
                }

                return (
                    <mark
                        key={segment.occurrenceId || idx}
                        data-occurrence-id={segment.occurrenceId}
                        className={cn(
                            "rounded-sm px-0.5 transition-colors",
                            segment.isCurrent
                                ? "bg-orange-400/60 ring-2 ring-orange-400/40"
                                : "bg-yellow-300/40"
                        )}
                    >
                        {segment.text}
                    </mark>
                );
            })}
        </span>
    );
}

export default HighlightedText;
