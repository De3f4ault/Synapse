import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
    listDocumentsApiV1DocumentsGet,
    uploadDocumentApiV1DocumentsUploadPost,
    deleteDocumentApiV1DocumentsDocumentIdDelete,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/common/EmptyState';
import {
    Upload,
    LayoutGrid,
    LayoutList,
    FileText,
    File,
    MoreVertical,
    Trash2,
    Eye,
    Download,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { DocumentResponse } from '@/api/generated/types.gen';

/**
 * Enhanced Documents Page
 *
 * Features:
 * - Drag-and-drop upload zone
 * - Card/Table view toggle
 * - Processing status indicators
 * - Progress bars for uploads
 * - File type icons
 * - Bulk upload support
 */

type ViewMode = 'grid' | 'table';

export function DocumentsPage() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    // Fetch documents
    const { data: documents, isLoading } = useQuery({
        queryKey: queryKeys.documents.list(),
                                                    queryFn: () => listDocumentsApiV1DocumentsGet(),
    });

    // Upload mutation
    const { mutate: uploadDocument } = useMutation({
        mutationFn: async (file: File) => {
            // Simulate progress
            const fileId = file.name;
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    const current = prev[fileId] || 0;
                    if (current >= 90) {
                        clearInterval(interval);
                        return prev;
                    }
                    return { ...prev, [fileId]: current + 10 };
                });
            }, 200);

            const formData = { file };
            const result = await uploadDocumentApiV1DocumentsUploadPost({ formData });

            clearInterval(interval);
            setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

            setTimeout(() => {
                setUploadProgress((prev) => {
                    const next = { ...prev };
                    delete next[fileId];
                    return next;
                });
            }, 1000);

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
            toast('Document uploaded successfully');
        },
        onError: (error, file) => {
            const fileId = file.name;
            setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[fileId];
                return next;
            });
            toast('Upload failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Delete mutation
    const { mutate: deleteDocument } = useMutation({
        mutationFn: (id: number) => deleteDocumentApiV1DocumentsDocumentIdDelete({ documentId: id }),
                                                   onSuccess: () => {
                                                       queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
                                                       toast('Document deleted successfully');
                                                   },
                                                   onError: (error) => {
                                                       toast('Failed to delete document', {
                                                           description: error instanceof Error ? error.message : 'Unknown error',
                                                       });
                                                   },
    });

    // Dropzone
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            acceptedFiles.forEach((file) => {
                uploadDocument(file);
            });
        },
        [uploadDocument]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
        multiple: true,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'processing':
                return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        >
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">
        Upload and manage your learning materials
        </p>
        </div>

        <div className="flex items-center gap-2">
        <Button
        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setViewMode('grid')}
        >
        <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setViewMode('table')}
        >
        <LayoutList className="h-4 w-4" />
        </Button>
        </div>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        >
        <div
        {...getRootProps()}
        className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
            isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent'
        )}
        >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">
        {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
        or click to browse (PDF, DOCX, TXT)
        </p>
        <Button variant="outline">Browse Files</Button>
        </div>
        </motion.div>

        {/* Upload Progress */}
        <AnimatePresence>
        {Object.entries(uploadProgress).length > 0 && (
            <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
            >
            {Object.entries(uploadProgress).map(([filename, progress]) => (
                <Card key={filename}>
                <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{filename}</span>
                </div>
                <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                </CardContent>
                </Card>
            ))}
            </motion.div>
        )}
        </AnimatePresence>

        {/* Documents List */}
        {isLoading ? (
            <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
            </div>
        ) : !documents || documents.length === 0 ? (
            <EmptyState
            icon={<FileText className="h-16 w-16" />}
            title="No documents yet"
            description="Upload your first document to get started"
            action={{
                label: 'Upload Document',
                onClick: () => { }, // Already have dropzone
            }}
            variant="no-data"
            />
        ) : viewMode === 'grid' ? (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
            {documents.map((doc: DocumentResponse) => (
                <DocumentCard key={doc.id} document={doc} onDelete={() => deleteDocument(doc.id)} />
            ))}
            </motion.div>
        ) : (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            >
            <Card>
            <CardContent className="p-0">
            <Table>
            <TableHeader>
            <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {documents.map((doc: DocumentResponse) => (
                <TableRow key={doc.id}>
                <TableCell className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{doc.filename}</span>
                </TableCell>
                <TableCell>
                <Badge variant="outline" className={getStatusColor(doc.processing_status)}>
                {getStatusIcon(doc.processing_status)}
                <span className="ml-1">{doc.processing_status}</span>
                </Badge>
                </TableCell>
                <TableCell>{(doc.file_size / 1024).toFixed(2)} KB</TableCell>
                <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View
                </DropdownMenuItem>
                <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
                </DropdownMenuItem>
                <DropdownMenuItem
                onClick={() => deleteDocument(doc.id)}
                className="text-destructive"
                >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
            </Table>
            </CardContent>
            </Card>
            </motion.div>
        )}
        </div>
    );
}

/**
 * Document Card Component
 */
interface DocumentCardProps {
    document: DocumentResponse;
    onDelete: () => void;
}

function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300';
            case 'processing':
                return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        >
        <Card className="hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
        <div className="p-2 rounded-lg bg-primary/10">
        <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{doc.filename}</h3>
        <p className="text-sm text-muted-foreground">
        {(doc.file_size / 1024).toFixed(2)} KB
        </p>
        </div>
        </div>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuItem>
        <Eye className="mr-2 h-4 w-4" />
        View
        </DropdownMenuItem>
        <DropdownMenuItem>
        <Download className="mr-2 h-4 w-4" />
        Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </CardHeader>

        <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <Badge variant="outline" className={getStatusColor(doc.processing_status)}>
        {getStatusIcon(doc.processing_status)}
        <span className="ml-1">{doc.processing_status}</span>
        </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
        Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}
