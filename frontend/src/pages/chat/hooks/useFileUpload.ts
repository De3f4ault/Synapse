/**
 * useFileUpload - Handle file attachments
 * Manages file upload, validation, and preview state
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadDocumentApiV1DocumentsUploadPost } from '@/api/generated/services.gen';
import type { DocumentResponse } from '@/api/generated/types.gen';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/utils';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'text/plain',
'text/markdown',
'image/png',
'image/jpeg',
'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadedFile {
  document: DocumentResponse;
  file: File;
  previewUrl?: string;
}

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = { file };
      return uploadDocumentApiV1DocumentsUploadPost({ formData });
    },
    onSuccess: (document, file) => {
      const previewUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : undefined;

      setUploadedFiles((prev) => [
        ...prev,
        { document, file, previewUrl },
      ]);

      toast.success(`File uploaded: ${file.name}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload file');
    },
  });

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: PDF, DOCX, TXT, MD, Images`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    return null;
  }, []);

  // Upload file with validation
  const uploadFile = useCallback(
    async (file: File) => {
      setIsValidating(true);

      // Validate
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        setIsValidating(false);
        return;
      }

      setIsValidating(false);

      // Upload
      uploadMutation.mutate(file);
    },
    [validateFile, uploadMutation]
  );

  // Remove uploaded file
  const removeFile = useCallback((documentId: number) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.document.id === documentId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.document.id !== documentId);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    uploadedFiles.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setUploadedFiles([]);
  }, [uploadedFiles]);

  return {
    uploadedFiles,
    uploadFile,
    removeFile,
    clearFiles,
    isUploading: uploadMutation.isPending,
    isValidating,
    validateFile,
  };
};
