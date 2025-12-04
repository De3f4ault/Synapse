import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatFileSize } from '@/lib/utils';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { ProcessingStatus } from './ProcessingStatus';
import {
    Upload,
    FileText,
    FileType,
    X,
    AlertCircle,
    CheckCircle,
    Sparkles,
} from 'lucide-react';
import type { DocumentResponse } from '@/api/generated';

/**
 * Enhanced DocumentUploader Component
 *
 * Improvements per documentation:
 * - Drag-and-drop with visual feedback
 * - Animated upload progress
 * - Processing status indicators
 * - Better file validation
 * - Smooth state transitions
 * - Enhanced error display
 */

interface DocumentUploaderProps {
    onUploadComplete?: (document: DocumentResponse) => void;
    className?: string;
    maxFiles?: number;
}

const ACCEPTED_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/epub+zip': ['.epub'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploader({
    onUploadComplete,
    className,
    maxFiles = 5,
}: DocumentUploaderProps) {
    const {
        upload,
        reset,
        uploadProgress,
        isUploading,
        uploadError,
        uploadedDocument,
        processingStatus,
        isProcessing,
        isComplete,
        isFailed,
    } = useDocumentUpload({
        onUploadComplete,
    });

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                upload(acceptedFiles[0]);
            }
        },
        [upload]
    );

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
        fileRejections,
    } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_FILE_SIZE,
        maxFiles,
        disabled: isUploading || isProcessing,
    });

    const getFileIcon = (type: string) => {
        if (type.includes('pdf'))
            return <FileText className="h-8 w-8 text-red-500" />;
        if (type.includes('word'))
            return <FileType className="h-8 w-8 text-blue-500" />;
        return <FileText className="h-8 w-8 text-muted-foreground" />;
    };

    // Show processing status if document is uploaded
    if (uploadedDocument && (isProcessing || isComplete || isFailed)) {
        return (
            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            >
            <Card className={className}>
            <CardContent className="p-6">
            <div className="flex items-start gap-4">
            <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            >
            {getFileIcon(uploadedDocument.file_type)}
            </motion.div>
            <div className="flex-1">
            <p className="font-medium">{uploadedDocument.filename}</p>
            <p className="text-sm text-muted-foreground">
            {formatFileSize(uploadedDocument.file_size)}
            </p>

            <div className="mt-4">
            {processingStatus && (
                <ProcessingStatus
                status={processingStatus.status}
                progress={processingStatus.progress_percentage}
                message={processingStatus.message}
                />
            )}
            </div>

            {isComplete && (
                <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                >
                <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={reset}
                >
                <Sparkles className="mr-2 h-4 w-4" />
                Upload Another
                </Button>
                </motion.div>
            )}
            </div>
            </div>
            </CardContent>
            </Card>
            </motion.div>
        );
    }

    // Show upload progress
    if (isUploading && uploadProgress) {
        return (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            >
            <Card className={className}>
            <CardContent className="p-6">
            <div className="flex items-center gap-4">
            <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
            <Upload className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
            <p className="font-medium">Uploading...</p>
            <span className="text-sm text-muted-foreground">
            {uploadProgress.percentage}%
            </span>
            </div>
            <Progress value={uploadProgress.percentage} className="h-2" />
            <p className="mt-1 text-sm text-muted-foreground">
            {formatFileSize(uploadProgress.loaded)} /{' '}
            {formatFileSize(uploadProgress.total)}
            </p>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}>
            <X className="h-4 w-4" />
            </Button>
            </div>
            </CardContent>
            </Card>
            </motion.div>
        );
    }

    return (
        <div className={className}>
        <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        >
        <Card
        {...getRootProps()}
        className={cn(
            'cursor-pointer border-2 border-dashed transition-all duration-300',
            isDragActive && 'border-primary bg-primary/5 scale-[1.02]',
            isDragAccept && 'border-green-500 bg-green-500/5',
            isDragReject && 'border-destructive bg-destructive/5',
            !isDragActive && 'hover:border-primary/50 hover:bg-accent/5'
        )}
        >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <input {...getInputProps()} />

        <motion.div
        className={cn(
            'rounded-full p-4 mb-4',
            isDragAccept && 'bg-green-100 dark:bg-green-900/30',
            isDragReject && 'bg-red-100 dark:bg-red-900/30',
            !isDragActive && 'bg-muted'
        )}
        animate={{
            scale: isDragActive ? 1.1 : 1,
            rotate: isDragActive ? [0, 5, -5, 0] : 0,
        }}
        transition={{ duration: 0.3 }}
        >
        {isDragAccept ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
        ) : isDragReject ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
        ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        </motion.div>

        <AnimatePresence mode="wait">
        {isDragActive ? (
            <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            >
            <p className="text-lg font-medium">
            {isDragAccept ? 'Drop to upload' : 'File type not accepted'}
            </p>
            </motion.div>
        ) : (
            <motion.div
            key="inactive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            >
            <p className="text-lg font-medium">
            Drag & drop your document here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
            or click to browse
            </p>
            </motion.div>
        )}
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
        {Object.values(ACCEPTED_TYPES)
            .flat()
            .map((ext, index) => (
                <motion.span
                key={ext}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                {ext}
                </motion.span>
            ))}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
            Max file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
            </CardContent>
            </Card>
            </motion.div>

            {/* File rejection errors */}
            <AnimatePresence>
            {fileRejections.length > 0 && (
                <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 space-y-2"
                >
                {fileRejections.map(({ file, errors }) => (
                    <div
                    key={file.name}
                    className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
                    >
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    {errors.map((error) => (
                        <p key={error.code} className="text-xs text-destructive">
                        {error.message}
                        </p>
                    ))}
                    </div>
                    </div>
                ))}
                </motion.div>
            )}
            </AnimatePresence>

            {/* Upload error */}
            <AnimatePresence>
            {uploadError && (
                <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
                >
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{uploadError}</p>
                </motion.div>
            )}
            </AnimatePresence>
            </div>
    );
}

export default DocumentUploader;
