import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { motion } from 'framer-motion';
import { Clock, User, FileText, RotateCcw, CheckCircle2, Calendar } from 'lucide-react';
import { getNoteVersionsApiV1NotesNoteIdVersionsGet } from '@/api/generated/services.gen';
import { QUERY_KEYS } from '@/lib/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { NoteVersionResponse } from '@/api/generated/types.gen';

/**
 * Enhanced Version History Component
 *
 * Features:
 * - Timeline-style version display
 * - Current version badge
 * - Restore capability with confirmation
 * - User information
 * - Relative and absolute timestamps
 * - Stagger animation
 * - Empty state
 * - Loading skeletons
 */

interface VersionHistoryProps {
    noteId: number;
    onRestoreVersion?: (versionId: number) => void;
}

export function VersionHistory({ noteId, onRestoreVersion }: VersionHistoryProps) {
    // Fetch versions
    const { data: versions = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.NOTES.VERSIONS(noteId)],
                                                        queryFn: () => getNoteVersionsApiV1NotesNoteIdVersionsGet({ noteId }),
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                <CardContent className="p-4">
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                </CardContent>
                </Card>
            ))}
            </div>
        );
    }

    if (versions.length === 0) {
        return (
            <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No version history yet"
            description="Version history will appear here after your first edit"
            variant="no-data"
            />
        );
    }

    // Sort versions by version_number descending (newest first)
    const sortedVersions = [...versions].sort(
        (a, b) => b.version_number - a.version_number
    );

    return (
        <div className="space-y-4">
        <CardHeader className="px-0">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Version History</CardTitle>
        </div>
        <Badge variant="outline">
        {versions.length} version{versions.length === 1 ? '' : 's'}
        </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
        Track changes and restore previous versions
        </p>
        </CardHeader>

        {/* Timeline */}
        <div className="relative space-y-4 pl-6">
        {/* Timeline line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

        {sortedVersions.map((version, index) => (
            <VersionCard
            key={version.id}
            version={version}
            index={index}
            isCurrent={index === 0}
            onRestore={onRestoreVersion}
            />
        ))}
        </div>
        </div>
    );
}

/**
 * Version Card Component
 */
interface VersionCardProps {
    version: NoteVersionResponse;
    index: number;
    isCurrent: boolean;
    onRestore?: (versionId: number) => void;
}

function VersionCard({ version, index, isCurrent, onRestore }: VersionCardProps) {
    return (
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="relative"
        >
        {/* Timeline dot */}
        <div
        className={cn(
            'absolute left-[-1.75rem] top-3 h-4 w-4 rounded-full border-2 bg-background',
            isCurrent
            ? 'border-primary bg-primary'
            : 'border-muted-foreground'
        )}
        >
        {isCurrent && (
            <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary opacity-50"
            />
        )}
        </div>

        <Card
        className={cn(
            'transition-all duration-200',
            isCurrent && 'border-primary shadow-md'
        )}
        >
        <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
        {/* Version Number & Title */}
        <div className="flex items-center gap-2 flex-wrap">
        <Badge
        variant={isCurrent ? 'default' : 'outline'}
        className={cn(
            'font-semibold',
            isCurrent && 'bg-primary'
        )}
        >
        v{version.version_number}
        </Badge>
        {isCurrent && (
            <Badge
            variant="secondary"
            className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
            >
            <CheckCircle2 className="h-3 w-3" />
            Current
            </Badge>
        )}
        <h4 className="font-medium line-clamp-1">{version.title}</h4>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span title={format(new Date(version.created_at), 'PPpp')}>
        {formatDistanceToNow(new Date(version.created_at), {
            addSuffix: true,
        })}
        </span>
        </div>

        <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" />
        <span>User #{version.created_by}</span>
        </div>

        <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span>{format(new Date(version.created_at), 'MMM d, yyyy')}</span>
        </div>
        </div>

        {/* Full Timestamp */}
        <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
        {format(new Date(version.created_at), 'PPpp')}
        </p>
        </div>
        </div>

        {/* Restore Action */}
        {!isCurrent && onRestore && (
            <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            >
            <Button
            size="sm"
            variant="outline"
            onClick={() => onRestore(version.id)}
            className="gap-2"
            >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
            </Button>
            </motion.div>
        )}
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}
