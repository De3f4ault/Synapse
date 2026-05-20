/**
 * GlobalDropZone — Full-page drag-and-drop overlay
 *
 * Modeled after Paperless-ngx file-drop component.
 * Shows an overlay when files are dragged anywhere on the page.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalDropZoneProps {
  onDrop: (files: File[]) => void;
  /** Accepted file types (MIME or extension) */
  accept?: string[];
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/epub+zip",
  "text/markdown",
];

export function GlobalDropZone({
  onDrop,
  accept = ACCEPTED_TYPES,
  disabled = false,
}: GlobalDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setDragCounter((c) => c + 1);
      if (e.dataTransfer?.types?.includes("Files")) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((c) => {
        const next = c - 1;
        if (next <= 0) {
          setIsDragging(false);
          return 0;
        }
        return next;
      });
    },
    []
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer?.files || []);

      // Filter by accepted types
      const validFiles = accept.length > 0
        ? droppedFiles.filter((f) =>
            accept.some(
              (type) =>
                f.type === type ||
                f.name.toLowerCase().endsWith(type.replace("*", ""))
            )
          )
        : droppedFiles;

      if (validFiles.length > 0) {
        onDrop(validFiles);
      }
    },
    [disabled, accept, onDrop]
  );

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Drop area */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-4",
              "w-[500px] h-[300px] rounded-2xl",
              "border-2 border-dashed border-primary/50",
              "bg-primary/10 backdrop-blur-xl",
            )}
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <Upload size={40} className="text-primary" />
              </motion.div>
              <FileText size={28} className="text-primary/80/50" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Drop files to upload
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, DOCX, images, and more
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
