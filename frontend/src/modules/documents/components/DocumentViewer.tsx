import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessingStatusBadge } from "./ProcessingStatus";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import {
  FileText,
  FileType,
  Trash2,
  ExternalLink,
  Clock,
  FileIcon,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { DocumentResponse } from "@/api/generated";

/**
 * Enhanced DocumentViewer Component
 *
 * Improvements per documentation:
 * - Better document preview with metadata
 * - Animated action buttons
 * - Enhanced visual hierarchy
 * - Smooth hover effects
 * - Better status indicators
 * - Improved responsive layout
 */

interface DocumentViewerProps {
  document: DocumentResponse;
  onDelete?: () => void;
  onGenerateFlashcards?: () => void;
  isDeleting?: boolean;
  className?: string;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf"))
    return <FileText className="h-12 w-12 text-red-500" />;
  if (fileType.includes("word") || fileType.includes("docx"))
    return <FileType className="h-12 w-12 text-blue-500" />;
  if (fileType.includes("epub"))
    return <FileIcon className="h-12 w-12 text-purple-500" />;
  if (fileType.includes("markdown") || fileType.includes("md"))
    return <FileText className="h-12 w-12 text-gray-500" />;
  return <FileText className="h-12 w-12 text-muted-foreground" />;
}

export function DocumentViewer({
  document,
  onDelete,
  onGenerateFlashcards,
  isDeleting = false,
  className,
}: DocumentViewerProps) {
  const isProcessed = document.processing_status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={className}>
        <CardHeader className="flex flex-row items-start gap-4">
          <motion.div
            className="shrink-0"
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            {getFileIcon(document.file_type)}
          </motion.div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg leading-tight">
              {document.filename}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <ProcessingStatusBadge status={document.processing_status} />
              <Badge variant="outline">{document.file_type}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatFileSize(document.file_size)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Document metadata grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {document.page_count && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg border p-3"
              >
                <p className="text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Pages
                </p>
                <p className="font-medium text-lg mt-1">
                  {document.page_count}
                </p>
              </motion.div>
            )}
            {document.word_count && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg border p-3"
              >
                <p className="text-muted-foreground">Words</p>
                <p className="font-medium text-lg mt-1">
                  {document.word_count.toLocaleString()}
                </p>
              </motion.div>
            )}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-lg border p-3"
            >
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Uploaded
              </p>
              <p className="font-medium mt-1">
                {formatRelativeTime(document.created_at)}
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-lg border p-3"
            >
              <p className="text-muted-foreground">Updated</p>
              <p className="font-medium mt-1">
                {formatRelativeTime(document.updated_at)}
              </p>
            </motion.div>
          </div>

          {/* Gemini AI status */}
          {document.gemini_file_uri && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.01 }}
              className="rounded-lg border p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Processing
                </span>
                {document.gemini_file_expired ? (
                  <Badge variant="secondary">Expired</Badge>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    Ready
                  </Badge>
                )}
              </div>
            </motion.div>
          )}

          {/* Actions with animations */}
          <div className="flex flex-wrap gap-2">
            {isProcessed && onGenerateFlashcards && (
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={onGenerateFlashcards}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Flashcards
                </Button>
              </motion.div>
            )}

            {document.gemini_file_uri && !document.gemini_file_expired && (
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="outline" asChild>
                  <a
                    href={document.gemini_file_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in Gemini
                  </a>
                </Button>
              </motion.div>
            )}

            {onDelete && (
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Loading skeleton for DocumentViewer.
 */
export function DocumentViewerSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start gap-4">
        <Skeleton className="h-12 w-12 rounded shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentViewer;
