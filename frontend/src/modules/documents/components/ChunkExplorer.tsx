import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getDocumentChunksApiV1DocumentsDocumentIdChunksGet } from '@/api/generated';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { Search, FileText, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { DocumentChunkResponse } from '@/api/generated';

/**
 * Enhanced ChunkExplorer Component
 *
 * Improvements per documentation:
 * - Enhanced chunk viewer with better layout
 * - Search highlighting within chunks
 * - Smooth animations for chunk selection
 * - Better pagination controls
 * - Copy functionality with feedback
 * - Improved visual hierarchy
 */

interface ChunkExplorerProps {
    documentId: number;
    className?: string;
}

interface ChunkCardProps {
    chunk: DocumentChunkResponse;
    isSelected: boolean;
    onClick: () => void;
    searchQuery?: string;
    index: number;
}

function ChunkCard({ chunk, isSelected, onClick, searchQuery, index }: ChunkCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(chunk.content);
            setCopied(true);
            toast({ title: 'Copied to clipboard', duration: 2000 });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: 'Failed to copy',
                variant: 'destructive',
            });
        }
    };

    // Highlight search query in content
    const highlightText = (text: string) => {
        if (!searchQuery) return text;
        const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
        return parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50">
            {part}
            </mark>
        ) : (
            part
        )
        );
    };

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        whileHover={{ scale: 1.02, y: -2 }}
        >
        <Card
        className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            isSelected && 'border-primary bg-primary/5 shadow-md'
        )}
        onClick={onClick}
        >
        <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
        <Badge variant="outline">#{chunk.chunk_index + 1}</Badge>
        {chunk.page && (
            <span className="text-xs text-muted-foreground">
            Page {chunk.page}
            </span>
        )}
        </div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopy}
        >
        {copied ? (
            <Check className="h-4 w-4 text-green-500" />
        ) : (
            <Copy className="h-4 w-4" />
        )}
        </Button>
        </motion.div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
        {highlightText(chunk.content)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
        {chunk.end_char - chunk.start_char} chars
        </span>
        {chunk.embedding_id && (
            <Badge variant="secondary" className="text-xs">
            Embedded
            </Badge>
        )}
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}

export function ChunkExplorer({ documentId, className }: ChunkExplorerProps) {
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChunkId, setSelectedChunkId] = useState<number | null>(null);
    const pageSize = 20;

    const { data: chunks, isLoading, isError } = useQuery({
        queryKey: [...queryKeys.documents.chunks(documentId.toString()), page, pageSize],
                                                          queryFn: () =>
                                                          getDocumentChunksApiV1DocumentsDocumentIdChunksGet({
                                                              documentId,
                                                              page,
                                                              pageSize,
                                                          }),
    });

    // Filter chunks by search query
    const filteredChunks = chunks?.filter((chunk) =>
    searchQuery
    ? chunk.content.toLowerCase().includes(searchQuery.toLowerCase())
    : true
    );

    const selectedChunk = chunks?.find((c) => c.id === selectedChunkId);

    if (isLoading) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Chunks
            </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 animate-shimmer" />
            ))}
            </div>
            </CardContent>
            </Card>
        );
    }

    if (isError || !chunks) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Document Chunks</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-muted-foreground">Failed to load document chunks</p>
            </CardContent>
            </Card>
        );
    }

    if (chunks.length === 0) {
        return (
            <Card className={className}>
            <CardHeader>
            <CardTitle>Document Chunks</CardTitle>
            </CardHeader>
            <CardContent>
            <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
            >
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">No chunks available</p>
            <p className="text-sm text-muted-foreground mt-1">
            Document may still be processing
            </p>
            </motion.div>
            </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn('flex gap-4', className)}>
        {/* Chunk list */}
        <Card className="flex-1">
        <CardHeader>
        <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Chunks ({filteredChunks?.length || 0})
        </CardTitle>
        </div>
        <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
        placeholder="Search chunks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        />
        </div>
        </CardHeader>
        <CardContent>
        <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
        <AnimatePresence mode="popLayout">
        {filteredChunks?.map((chunk, index) => (
            <ChunkCard
            key={chunk.id}
            chunk={chunk}
            isSelected={selectedChunkId === chunk.id}
            onClick={() => setSelectedChunkId(chunk.id)}
            searchQuery={searchQuery}
            index={index}
            />
        ))}
        </AnimatePresence>
        </div>
        </ScrollArea>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
        </Button>
        </motion.div>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
        variant="outline"
        size="sm"
        onClick={() => setPage((p) => p + 1)}
        disabled={chunks.length < pageSize}
        >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        </motion.div>
        </div>
        </CardContent>
        </Card>

        {/* Selected chunk detail with animation */}
        <AnimatePresence>
        {selectedChunk && (
            <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            >
            <Card className="w-96 shrink-0">
            <CardHeader>
            <CardTitle className="text-base">
            Chunk #{selectedChunk.chunk_index + 1}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
            {selectedChunk.page && (
                <Badge variant="outline">Page {selectedChunk.page}</Badge>
            )}
            <Badge variant="secondary">
            {selectedChunk.end_char - selectedChunk.start_char} chars
            </Badge>
            </div>
            </CardHeader>
            <CardContent>
            <ScrollArea className="h-[400px]">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {selectedChunk.content}
            </p>
            </ScrollArea>
            </CardContent>
            </Card>
            </motion.div>
        )}
        </AnimatePresence>
        </div>
    );
}

export default ChunkExplorer;
