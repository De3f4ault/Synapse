/**
 * File attachment types
 * Types for file handling and preview
 */

/**
 * File category
 */
export type FileCategory =
| 'IMAGE'
| 'DOCUMENT'
| 'SPREADSHEET'
| 'PRESENTATION'
| 'TEXT'
| 'CODE'
| 'AUDIO'
| 'VIDEO'
| 'OTHER';

/**
 * File upload status
 */
export type FileUploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

/**
 * File attachment (base)
 */
export interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  category: FileCategory;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

/**
 * File upload state
 */
export interface FileUploadState {
  file: File;
  id: string;
  status: FileUploadStatus;
  progress: number;
  error?: string;
  uploadedFile?: FileAttachment;
}

/**
 * File validation error
 */
export interface FileValidationError {
  code: 'INVALID_TYPE' | 'TOO_LARGE' | 'TOO_MANY' | 'INVALID_NAME' | 'CORRUPTED';
  message: string;
  filename: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  file: File;
  errors: FileValidationError[];
  warnings: string[];
}

/**
 * File metadata
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  extension: string;
  lastModified: Date;
  dimensions?: FileDimensions;
  duration?: number; // For audio/video
  pageCount?: number; // For documents
  encoding?: string; // For text files
}

/**
 * File dimensions (for images/videos)
 */
export interface FileDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Image file details
 */
export interface ImageFileDetails extends FileMetadata {
  category: 'IMAGE';
  dimensions: FileDimensions;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}

/**
 * Document file details
 */
export interface DocumentFileDetails extends FileMetadata {
  category: 'DOCUMENT';
  pageCount: number;
  author?: string;
  title?: string;
  isSearchable?: boolean;
}

/**
 * Audio file details
 */
export interface AudioFileDetails extends FileMetadata {
  category: 'AUDIO';
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

/**
 * Video file details
 */
export interface VideoFileDetails extends FileMetadata {
  category: 'VIDEO';
  duration: number;
  dimensions: FileDimensions;
  bitrate?: number;
  codec?: string;
  frameRate?: number;
}

/**
 * File preview mode
 */
export type FilePreviewMode = 'thumbnail' | 'inline' | 'modal' | 'external';

/**
 * File preview state
 */
export interface FilePreviewState {
  file: FileAttachment;
  mode: FilePreviewMode;
  isLoading: boolean;
  error?: string;
  previewUrl?: string;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  compress?: boolean;
  generateThumbnail?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * File download options
 */
export interface FileDownloadOptions {
  filename?: string;
  saveAs?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * File compression options
 */
export interface FileCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * File processing result
 */
export interface FileProcessingResult {
  originalFile: File;
  processedFile?: File;
  metadata: FileMetadata;
  thumbnailUrl?: string;
  previewUrl?: string;
  warnings?: string[];
}

/**
 * File list state
 */
export interface FileListState {
  files: FileUploadState[];
  totalSize: number;
  isValid: boolean;
  errors: FileValidationError[];
}

/**
 * File drop zone state
 */
export interface FileDropZoneState {
  isDragging: boolean;
  isProcessing: boolean;
  files: File[];
  error?: string;
}

/**
 * File type configuration
 */
export interface FileTypeConfig {
  category: FileCategory;
  mimeTypes: string[];
  extensions: string[];
  maxSize: number;
  icon: string;
  color: string;
  supportsPreview: boolean;
  supportsThumbnail: boolean;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  type: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

/**
 * File batch upload result
 */
export interface FileBatchUploadResult {
  successful: FileUploadResponse[];
  failed: Array<{
    file: File;
    error: string;
  }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * File storage info
 */
export interface FileStorageInfo {
  used: number;
  total: number;
  remaining: number;
  percentage: number;
}

/**
 * File action type
 */
export type FileAction = 'view' | 'download' | 'delete' | 'share' | 'rename' | 'move';

/**
 * File action event
 */
export interface FileActionEvent {
  action: FileAction;
  fileId: string;
  data?: any;
}
