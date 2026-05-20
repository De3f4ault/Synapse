/**
 * JumpToDropdown - Navigate between occurrences within a session
 * 
 * Shows all match locations with preview snippets for quick navigation.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Bot, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchOccurrence } from '../types';

interface JumpToDropdownProps {
    occurrences: SearchOccurrence[];
    currentIndex: number;
    onJump: (index: number) => void;
    className?: string;
}

function getOccurrenceIcon(occ: SearchOccurrence) {
    if (occ.blockType === 'code') return Code;
    if (occ.role === 'user') return User;
    return Bot;
}

function getOccurrenceLabel(occ: SearchOccurrence): string {
    const roleLabel = occ.role === 'user' ? 'You' : 'AI';
    const typeLabel = occ.blockType === 'code' ? ' (code)' : '';
    return `${roleLabel}${typeLabel}`;
}

export function JumpToDropdown({
    occurrences,
    currentIndex,
    onJump,
    className,
}: JumpToDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (occurrences.length <= 1) return null;

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            {/* Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1 px-2 py-1 text-xs rounded-md",
                    "bg-foreground/5 hover:bg-muted border border-border",
                    "transition-colors"
                )}
            >
                <span className="text-muted-foreground">Jump to</span>
                <ChevronDown className={cn(
                    "size-3 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={cn(
                    "absolute top-full left-0 mt-1 z-50",
                    "w-64 max-h-64 overflow-y-auto",
                    "bg-popover border border-border rounded-lg shadow-xl",
                    "py-1"
                )}>
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                        {occurrences.length} matches
                    </div>

                    {occurrences.map((occ, idx) => {
                        const Icon = getOccurrenceIcon(occ);
                        const label = getOccurrenceLabel(occ);
                        const isActive = idx === currentIndex;

                        return (
                            <button
                                key={occ.id}
                                onClick={() => {
                                    onJump(idx);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-start gap-2 px-2 py-1.5",
                                    "text-left text-xs transition-colors",
                                    isActive
                                        ? "bg-primary/20 text-primary"
                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon className="size-3 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">{label}</span>
                                        <span className="text-[10px] text-muted-foreground/70">
                                            #{idx + 1}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        "...{occ.matchText}..."
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default JumpToDropdown;
