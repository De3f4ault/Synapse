/**
 * SearchHeatmap - Visual indicators on scrollbar showing match positions
 * 
 * Provides at-a-glance density awareness of where matches are located
 * in the conversation without scrolling.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SearchOccurrence } from '../types';

interface SearchHeatmapProps {
    occurrences: SearchOccurrence[];
    totalMessages: number;
    currentIndex: number;
    containerHeight: number;
    className?: string;
}

export function SearchHeatmap({
    occurrences,
    totalMessages,
    currentIndex,
    containerHeight,
    className,
}: SearchHeatmapProps) {
    // Calculate relative positions for each occurrence
    const markers = useMemo(() => {
        if (totalMessages === 0 || occurrences.length === 0) return [];

        // Group by message to avoid overlapping markers
        const messagePositions = new Map<number, { count: number; isActive: boolean }>();

        occurrences.forEach((occ, idx) => {
            const existing = messagePositions.get(occ.messageIndex);
            if (existing) {
                existing.count++;
                if (idx === currentIndex) existing.isActive = true;
            } else {
                messagePositions.set(occ.messageIndex, {
                    count: 1,
                    isActive: idx === currentIndex,
                });
            }
        });

        return Array.from(messagePositions.entries()).map(([messageIndex, data]) => ({
            position: (messageIndex / totalMessages) * 100,
            count: data.count,
            isActive: data.isActive,
        }));
    }, [occurrences, totalMessages, currentIndex]);

    if (markers.length === 0) return null;

    return (
        <div
            className={cn(
                "absolute right-1 top-0 w-1.5 h-full pointer-events-none z-10",
                className
            )}
            style={{ height: containerHeight }}
        >
            {markers.map((marker, idx) => (
                <div
                    key={idx}
                    className={cn(
                        "absolute w-full rounded-full transition-all",
                        marker.isActive
                            ? "bg-primary h-2"
                            : "bg-primary/40 h-1",
                        marker.count > 2 && "bg-primary/60"
                    )}
                    style={{
                        top: `${marker.position}%`,
                        transform: 'translateY(-50%)',
                    }}
                    title={`${marker.count} match${marker.count > 1 ? 'es' : ''}`}
                />
            ))}
        </div>
    );
}

export default SearchHeatmap;
