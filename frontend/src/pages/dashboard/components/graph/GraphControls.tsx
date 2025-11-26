import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Search,
    Filter,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GraphFilters } from '../../types/graph.types';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface GraphControlsProps {
    filters: GraphFilters;
    onToggleFilter: (filter: keyof GraphFilters) => void;
    onSearchChange: (query: string) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
    stats?: {
        totalNodes: number;
        totalLinks: number;
        nodesByType: Record<string, number>;
    };
}

/**
 * GraphControls - Interactive controls for knowledge graph
 *
 * Features:
 * - Zoom controls (in, out, reset)
 * - Module type filters with checkboxes
 * - Search functionality
 * - Graph statistics display
 * - Responsive layout
 */
export function GraphControls({
    filters,
    onToggleFilter,
    onSearchChange,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    stats,
}: GraphControlsProps) {
    const [searchOpen, setSearchOpen] = useState(false);

    const activeFilters = [
        filters.showDocuments && 'documents',
        filters.showNotes && 'notes',
        filters.showFlashcards && 'flashcards',
        filters.showChats && 'chats',
        filters.showQuizzes && 'quizzes',
    ].filter(Boolean).length;

    return (
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3 flex-wrap"
        >
        {/* Left: Stats */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {stats && (
            <>
            <Badge variant="outline" className="font-normal">
            {stats.totalNodes} nodes
            </Badge>
            <Badge variant="outline" className="font-normal">
            {stats.totalLinks} connections
            </Badge>
            </>
        )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
        {searchOpen ? (
            <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-1"
            >
            <Input
            type="text"
            placeholder="Search nodes..."
            value={filters.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 text-sm"
            autoFocus
            />
            <Button
            variant="ghost"
            size="sm"
            onClick={() => {
                setSearchOpen(false);
                onSearchChange('');
            }}
            >
            <X className="h-4 w-4" />
            </Button>
            </motion.div>
        ) : (
            <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            >
            <Search className="h-4 w-4" />
            </Button>
        )}
        </div>

        {/* Filter Popover */}
        <Popover>
        <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
        <Filter className="h-4 w-4" />
        {activeFilters < 5 && (
            <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
            {activeFilters}
            </Badge>
        )}
        </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
        <h4 className="font-semibold text-sm">Filter by Type</h4>

        <div className="space-y-3">
        {/* Documents */}
        <div className="flex items-center space-x-2">
        <Checkbox
        id="filter-documents"
        checked={filters.showDocuments}
        onCheckedChange={() => onToggleFilter('showDocuments')}
        />
        <Label
        htmlFor="filter-documents"
        className="flex items-center gap-2 cursor-pointer"
        >
        <span>Documents</span>
        {stats && (
            <Badge variant="secondary" className="text-xs">
            {stats.nodesByType.documents || 0}
            </Badge>
        )}
        </Label>
        </div>

        {/* Notes */}
        <div className="flex items-center space-x-2">
        <Checkbox
        id="filter-notes"
        checked={filters.showNotes}
        onCheckedChange={() => onToggleFilter('showNotes')}
        />
        <Label
        htmlFor="filter-notes"
        className="flex items-center gap-2 cursor-pointer"
        >
        <span>Notes</span>
        {stats && (
            <Badge variant="secondary" className="text-xs">
            {stats.nodesByType.notes || 0}
            </Badge>
        )}
        </Label>
        </div>

        {/* Flashcards */}
        <div className="flex items-center space-x-2">
        <Checkbox
        id="filter-flashcards"
        checked={filters.showFlashcards}
        onCheckedChange={() => onToggleFilter('showFlashcards')}
        />
        <Label
        htmlFor="filter-flashcards"
        className="flex items-center gap-2 cursor-pointer"
        >
        <span>Flashcards</span>
        {stats && (
            <Badge variant="secondary" className="text-xs">
            {stats.nodesByType.flashcards || 0}
            </Badge>
        )}
        </Label>
        </div>

        {/* Chats */}
        <div className="flex items-center space-x-2">
        <Checkbox
        id="filter-chats"
        checked={filters.showChats}
        onCheckedChange={() => onToggleFilter('showChats')}
        />
        <Label
        htmlFor="filter-chats"
        className="flex items-center gap-2 cursor-pointer"
        >
        <span>Chats</span>
        {stats && (
            <Badge variant="secondary" className="text-xs">
            {stats.nodesByType.chats || 0}
            </Badge>
        )}
        </Label>
        </div>

        {/* Quizzes */}
        <div className="flex items-center space-x-2">
        <Checkbox
        id="filter-quizzes"
        checked={filters.showQuizzes}
        onCheckedChange={() => onToggleFilter('showQuizzes')}
        />
        <Label
        htmlFor="filter-quizzes"
        className="flex items-center gap-2 cursor-pointer"
        >
        <span>Quizzes</span>
        {stats && (
            <Badge variant="secondary" className="text-xs">
            {stats.nodesByType.quizzes || 0}
            </Badge>
        )}
        </Label>
        </div>
        </div>
        </div>
        </PopoverContent>
        </Popover>

        {/* Zoom Controls */}
        <div className="flex items-center border rounded-md">
        <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        className="rounded-none border-r"
        >
        <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
        variant="ghost"
        size="sm"
        onClick={onResetZoom}
        className="rounded-none border-r"
        >
        <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        className="rounded-none"
        >
        <ZoomIn className="h-4 w-4" />
        </Button>
        </div>
        </div>
        </motion.div>
    );
}
