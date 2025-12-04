/**
 * File upload/preview utilities
 * Handles file validation, preview generation, and metadata extraction
 */

import { formatFileSize } from '@/lib/utils';

/**
 * File type categories
 */
export const FILE_CATEGORIES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PRESENTATION: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  TEXT: ['text/plain', 'text/markdown', 'text/csv'],
  CODE: ['text/javascript', 'text/typescript', 'application/json', 'text/html', 'text/css'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
} as const;

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  DOCUMENT: 25 * 1024 * 1024, // 25 MB
  SPREADSHEET: 25 * 1024 * 1024, // 25 MB
  TEXT: 5 * 1024 * 1024, // 5 MB
  CODE: 5 * 1024 * 1024, // 5 MB
  DEFAULT: 50 * 1024 * 1024, // 50 MB
} as const;

/**
 * Get file category from MIME type
 */
export const getFileCategory = (mimeType: string): keyof typeof FILE_CATEGORIES | 'OTHER' => {
  for (const [category, types] of Object.entries(FILE_CATEGORIES)) {
    if (types.includes(mimeType as any)) {
      return category as keyof typeof FILE_CATEGORIES;
    }
  }
  return 'OTHER';
};

/**
 * Get file icon based on type
 */
export const getFileIcon = (mimeType: string): string => {
  const category = getFileCategory(mimeType);

  const icons: Record<string, string> = {
    IMAGE: '🖼️',
    DOCUMENT: '📄',
    SPREADSHEET: '📊',
    PRESENTATION: '📽️',
    TEXT: '📝',
    CODE: '💻',
    AUDIO: '🎵',
    VIDEO: '🎬',
    OTHER: '📎',
  };

  return icons[category] || icons.OTHER;
};

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate file before upload
 */
export const validateFile = (file: File): ValidationResult => {
  const warnings: string[] = [];

  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file name
  if (!file.name || file.name.length === 0) {
    return { valid: false, error: 'Invalid file name' };
  }

  // Check for suspicious file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.app'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }

  // Check file size
  const category = getFileCategory(file.type);
  const maxSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.DEFAULT;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${category.toLowerCase()} files is ${formatFileSize(maxSize)}`,
    };
  }

  // Warn if file is large but within limit
  if (file.size > maxSize * 0.8) {
    warnings.push(`File is approaching size limit (${formatFileSize(file.size)} / ${formatFileSize(maxSize)})`);
  }

  // Check MIME type
  if (!file.type) {
    warnings.push('File type could not be determined');
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
};

/**
 * Generate preview URL for file
 */
export const generatePreviewUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const category = getFileCategory(file.type);

    // Only generate preview for images
    if (category !== 'IMAGE') {
      reject(new Error('Preview not available for this file type'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to generate preview'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Extract file metadata
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  category: string;
  extension: string;
  lastModified: Date;
  dimensions?: { width: number; height: number };
}

export const extractFileMetadata = async (file: File): Promise<FileMetadata> => {
  const extension = file.name.substring(file.name.lastIndexOf('.') + 1);
  const category = getFileCategory(file.type);

  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    category,
    extension,
    lastModified: new Date(file.lastModified),
  };

  // Get image dimensions
  if (category === 'IMAGE') {
    try {
      const dimensions = await getImageDimensions(file);
      metadata.dimensions = dimensions;
    } catch {
      // Ignore dimension errors
    }
  }

  return metadata;
};

/**
 * Get image dimensions
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Convert file to base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to convert file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Read text file content
 */
export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Compress image file
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.9
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // Create canvas and compress
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Download file from URL
 */
export const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format file list for display
 */
export const formatFileList = (files: File[]): string => {
  if (files.length === 0) return 'No files';
  if (files.length === 1) return files[0].name;
  return `${files.length} files`;
};

/**
 * Check if file is an image
 */
export const isImage = (file: File): boolean => {
  return FILE_CATEGORIES.IMAGE.includes(file.type as any);
};

/**
 * Check if file is a document
 */
export const isDocument = (file: File): boolean => {
  return FILE_CATEGORIES.DOCUMENT.includes(file.type as any);
};

/**
 * Check if file is text
 */
export const isText = (file: File): boolean => {
  return FILE_CATEGORIES.TEXT.includes(file.type as any) ||
  FILE_CATEGORIES.CODE.includes(file.type as any);
};
