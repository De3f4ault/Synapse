import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ExternalLink,
    Calendar,
    FileText,
    Target,
    Link2,
    Clock
} from 'lucide-react';
import { cn, formatRelativeTime, formatFileSize } from '@/lib/utils';
import type { GraphNode } from '../../types/graph.types';
import { ModuleBadge } from '../shared/ModuleBadge';
import { getNodeIcon } from './GraphNode';

interface NodeDetailModalProps {
    node: GraphNode | null;
    connections?: GraphNode[];
    onClose: () => void;
    onNodeClick?: (node: GraphNode) => void;
}

/**
 * NodeDetailModal - Detailed view of graph node
 *
 * Features:
 * - Node metadata display
 * - Connected nodes list
 * - Quick actions (open, edit, delete)
 * - Type-specific information
 */
export function NodeDetailModal({
    node,
    connections = [],
    onClose,
    onNodeClick
}: NodeDetailModalProps) {
    if (!node) return null;

    const Icon = getNodeIcon(node.type);

    return (
        <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
        <div className="flex items-start gap-3">
        <div className={cn(
            'p-2 rounded-lg',
            'bg-primary/10'
        )}>
        <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
        <DialogTitle className="text-xl mb-1">
        {node.label}
        </DialogTitle>
        <ModuleBadge moduleType={node.type} />
        </div>
        </div>
        </DialogHeader>

        <div className="space-y-6">
        {/* Metadata Section */}
        <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Information
        </h4>

        <div className="grid grid-cols-2 gap-3 text-sm">
        {renderNodeMetadata(node)}
        </div>
        </div>

        {/* Connections Section */}
        {connections.length > 0 && (
            <>
            <Separator />
            <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Connected Resources ({connections.length})
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto">
            {connections.slice(0, 10).map((connectedNode) => {
                const ConnectedIcon = getNodeIcon(connectedNode.type);
                return (
                    <motion.button
                    key={connectedNode.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    onClick={() => onNodeClick?.(connectedNode)}
                    >
                    <ConnectedIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">
                    {connectedNode.label}
                    </span>
                    <ModuleBadge moduleType={connectedNode.type} size="sm" />
                    </motion.button>
                );
            })}
            {connections.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                ... and {connections.length - 10} more
                </p>
            )}
            </div>
            </div>
            </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
        <Button
        className="flex-1"
        onClick={() => {
            window.location.href = getNodeUrl(node);
        }}
        >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open
        </Button>
        <Button
        variant="outline"
        onClick={onClose}
        >
        Close
        </Button>
        </div>
        </div>
        </DialogContent>
        </Dialog>
    );
}

// Render node-specific metadata
function renderNodeMetadata(node: GraphNode) {
    const metadata = node.metadata;
    const items: React.ReactNode[] = [];

    // Common fields
    if (metadata.createdAt) {
        items.push(
            <div key="created" className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created
            </span>
            <span className="font-medium">
            {formatRelativeTime(metadata.createdAt)}
            </span>
            </div>
        );
    }

    // Type-specific fields
    switch (node.type) {
        case 'document':
            if (metadata.fileSize) {
                items.push(
                    <div key="size" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">File Size</span>
                    <span className="font-medium">{formatFileSize(metadata.fileSize)}</span>
                    </div>
                );
            }
            if (metadata.pageCount) {
                items.push(
                    <div key="pages" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Pages</span>
                    <span className="font-medium">{metadata.pageCount}</span>
                    </div>
                );
            }
            break;

        case 'note':
            if (metadata.contentLength) {
                items.push(
                    <div key="length" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Length</span>
                    <span className="font-medium">{metadata.contentLength} chars</span>
                    </div>
                );
            }
            if (metadata.childrenCount !== undefined) {
                items.push(
                    <div key="children" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Sub-notes</span>
                    <span className="font-medium">{metadata.childrenCount}</span>
                    </div>
                );
            }
            break;

        case 'flashcard':
            if (metadata.timesReviewed !== undefined) {
                items.push(
                    <div key="reviews" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Reviews
                    </span>
                    <span className="font-medium">{metadata.timesReviewed}</span>
                    </div>
                );
            }
            if (metadata.accuracy !== undefined) {
                items.push(
                    <div key="accuracy" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Accuracy</span>
                    <span className={cn(
                        'font-medium',
                        metadata.accuracy >= 0.7 ? 'text-green-600' :
                        metadata.accuracy >= 0.5 ? 'text-yellow-600' :
                        'text-red-600'
                    )}>
                    {(metadata.accuracy * 100).toFixed(0)}%
                    </span>
                    </div>
                );
            }
            if (metadata.nextReview) {
                items.push(
                    <div key="next" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next Review
                    </span>
                    <span className="font-medium">
                    {formatRelativeTime(metadata.nextReview)}
                    </span>
                    </div>
                );
            }
            break;

        case 'chat':
            if (metadata.messageCount) {
                items.push(
                    <div key="messages" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Messages</span>
                    <span className="font-medium">{metadata.messageCount}</span>
                    </div>
                );
            }
            break;

        case 'quiz':
            if (metadata.questionCount) {
                items.push(
                    <div key="questions" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Questions</span>
                    <span className="font-medium">{metadata.questionCount}</span>
                    </div>
                );
            }
            if (metadata.difficulty) {
                items.push(
                    <div key="difficulty" className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Difficulty</span>
                    <Badge variant="outline" className="w-fit capitalize">
                    {metadata.difficulty}
                    </Badge>
                    </div>
                );
            }
            break;
    }

    return items.length > 0 ? items : (
        <p className="text-sm text-muted-foreground col-span-2">
        No additional information available
        </p>
    );
}

// Get URL for node
function getNodeUrl(node: GraphNode): string {
    const id = node.metadata.id;

    switch (node.type) {
        case 'document':
            return `/documents/${id}`;
        case 'note':
            return `/notes/${id}`;
        case 'flashcard':
            return `/flashcards/review?card=${id}`;
        case 'chat':
            return `/chat/${id}`;
        case 'quiz':
            return `/quizzes/${id}`;
        default:
            return '/dashboard';
    }
}
