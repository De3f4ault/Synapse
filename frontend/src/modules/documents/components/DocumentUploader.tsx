import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { ArrowDown, Upload } from "lucide-react";
import type { DocumentResponse } from "@/api/generated";
import { UploadQueueItem } from "./UploadQueueItem";

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
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/epub+zip": [".epub"],
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

  if (uploadedDocument && (isProcessing || isComplete || isFailed)) {
    // This block intentionally removed as it is now handled by the queue view below
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && acceptedFiles[0]) {
        upload(acceptedFiles[0]);
      }
    },
    [upload],
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    disabled: isUploading || isProcessing,
  });



  // Logic moved to queue view
  const { currentFile } = useDocumentUpload({
    onUploadComplete
  });


  // Logic moved to queue view

  return (
    <div className={className}>
      {/* 1. Compact Drop Zone */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
        <Card
          {...getRootProps()}
          className={cn(
            "cursor-pointer border border-dashed transition-all duration-300",
            isDragActive
              ? "border-primary bg-primary/5 shadow-md"
              : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5",
          )}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <input {...getInputProps()} />

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-muted">
              {isDragActive ? (
                <ArrowDown className="h-6 w-6 animate-bounce text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium">
                {isDragActive ? "Drop file now" : "Click or drag to upload"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, TXT, MD, EPUB (Max 50MB)
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Upload Queue / Recent Activity */}
      <AnimatePresence mode="popLayout">
        {(isUploading || uploadedDocument || uploadError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 flex flex-col gap-3"
          >
            <h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Recent Activity
            </h3>

            {/* Current Upload */}
            {isUploading && currentFile && (
              <UploadQueueItem
                key="current-upload"
                file={currentFile}
                status="uploading"
                progress={uploadProgress?.percentage || 0}
                onRemove={reset}
              />
            )}

            {/* Uploaded File (Processing or Complete) */}
            {uploadedDocument && !isUploading && (
              <UploadQueueItem
                key={uploadedDocument.id}
                file={{
                  name: uploadedDocument.filename,
                  type: uploadedDocument.file_type || "application/octet-stream",
                  size: uploadedDocument.file_size
                } as File}
                // Map processing state to "uploading" visual with indeterminate/backend progress
                status={isProcessing ? "uploading" : isFailed ? "error" : "success"}
                progress={isProcessing ? (processingStatus?.progress_percentage || 100) : 100}
                error={isFailed ? "Processing failed" : undefined}
                onRemove={reset}
              />
            )}

            {/* Errors */}
            {uploadError && (
              <UploadQueueItem
                key="error-upload"
                file={currentFile || { name: "Upload Failed", type: "", size: 0 } as File}
                status="error"
                error={uploadError}
                onRemove={reset}
              />
            )}

            {fileRejections.map(({ file, errors }: FileRejection) => (
              <UploadQueueItem
                key={file.name}
                file={file}
                status="error"
                error={errors[0]?.message}
                onRemove={reset}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DocumentUploader;
